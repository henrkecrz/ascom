import { getDatabase, scheduleSave, saveDatabase, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT } from './connection';
import { logger } from '../lib/logger';
import fs from 'fs';
import path from 'path';

export interface FileQuery {
  category?: string;
  extension?: string;
  search?: string;
  parent_folder?: string;
  limit?: number;
  offset?: number;
}

export interface FileResult {
  id: number;
  name: string;
  full_path: string;
  relative_path: string;
  extension: string | null;
  size_bytes: number;
  size_formatted: string;
  last_modified: string;
  category: string;
  parent_folder: string;
  depth: number;
  has_text?: boolean;
  word_count?: number;
  has_blob?: boolean;
}

function rowToFile(row: any): FileResult {
  return {
    id: Number(row.id),
    name: String(row.name),
    full_path: String(row.full_path),
    relative_path: String(row.relative_path),
    extension: row.extension !== null && row.extension !== undefined ? String(row.extension) : null,
    size_bytes: Number(row.size_bytes),
    size_formatted: String(row.size_formatted),
    last_modified: String(row.last_modified),
    category: String(row.category),
    parent_folder: String(row.parent_folder),
    depth: Number(row.depth),
  };
}

export function insertFile(file: {
  name: string;
  full_path: string;
  relative_path: string;
  extension: string | null;
  size_bytes: number;
  size_formatted: string;
  last_modified: string;
  category: string;
  parent_folder: string;
  depth: number;
}): number {
  const db = getDatabase();
  if (!db) return 0;

  db.run(
    `INSERT OR IGNORE INTO files (name, full_path, relative_path, extension, size_bytes, size_formatted, last_modified, category, parent_folder, depth)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [file.name, file.full_path, file.relative_path, file.extension, file.size_bytes, file.size_formatted, file.last_modified, file.category, file.parent_folder, file.depth]
  );

  const result = db.exec('SELECT last_insert_rowid() as id');
  if (result.length > 0 && result[0].values.length > 0) {
    const id = Number(result[0].values[0][0]);
    if (id !== 0) return id;
  }

  db.run(
    `UPDATE files SET name=?, full_path=?, relative_path=?, extension=?, size_bytes=?, size_formatted=?, last_modified=?, category=?, parent_folder=?, depth=?
     WHERE full_path = ?`,
    [file.name, file.full_path, file.relative_path, file.extension, file.size_bytes, file.size_formatted, file.last_modified, file.category, file.parent_folder, file.depth, file.full_path]
  );

  const stmt = db.prepare('SELECT id FROM files WHERE full_path = ?');
  stmt.bind([file.full_path]);
  if (stmt.step()) {
    const id = Number(stmt.get()[0]);
    stmt.free();
    return id;
  }
  stmt.free();
  return 0;
}

export function storeFileBlob(fileId: number, data: Buffer): void {
  const db = getDatabase();
  if (!db) return;

  try {
    const blobsDir = path.join(process.cwd(), 'data', 'blobs');
    if (!fs.existsSync(blobsDir)) {
      fs.mkdirSync(blobsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(blobsDir, `${fileId}.bin`), data);
    db.run('INSERT OR REPLACE INTO file_blobs (file_id, data) VALUES (?, NULL)', [fileId]);
    scheduleSave();
  } catch (err) {
    logger.error(`Erro ao salvar blob do arquivo ${fileId} em disco`, err);
  }
}

export function getFileBlob(fileId: number): Buffer | null {
  try {
    const blobsDir = path.join(process.cwd(), 'data', 'blobs');
    const filePath = path.join(blobsDir, `${fileId}.bin`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (err) {
    logger.error(`Erro ao ler blob do arquivo ${fileId} do disco`, err);
  }
  return null;
}

export function hasFileBlob(fileId: number): boolean {
  const db = getDatabase();
  if (!db) return false;
  const stmt = db.prepare('SELECT 1 FROM file_blobs WHERE file_id = ?');
  stmt.bind([fileId]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

export function deleteFileBlob(fileId: number): void {
  const db = getDatabase();
  if (!db) return;
  
  db.run('DELETE FROM file_blobs WHERE file_id = ?', [fileId]);
  
  try {
    const blobsDir = path.join(process.cwd(), 'data', 'blobs');
    const filePath = path.join(blobsDir, `${fileId}.bin`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.error(`Erro ao deletar arquivo de blob ${fileId} do disco`, err);
  }
  scheduleSave();
}

export function queryFiles(query: FileQuery): { files: FileResult[]; total: number } {
  const db = getDatabase();
  if (!db) return { files: [], total: 0 };

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.category) {
    conditions.push('f.category = ?');
    params.push(query.category);
  }
  if (query.extension) {
    conditions.push('f.extension = ?');
    params.push(query.extension);
  }
  if (query.parent_folder) {
    conditions.push('f.parent_folder = ?');
    params.push(query.parent_folder);
  }
  if (query.search) {
    conditions.push('(f.name LIKE ? OR f.category LIKE ? OR f.parent_folder LIKE ?)');
    const searchTerm = `%${query.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  let countStmt = db.prepare(`SELECT COUNT(*) as total FROM files f ${whereClause}`);
  if (params.length > 0) countStmt.bind(params);
  countStmt.step();
  const total = Number(countStmt.getAsObject().total);
  countStmt.free();

  const limit = Math.min(query.limit || DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
  const offset = query.offset || 0;

  const dataParams = [...params, limit, offset];
  const dataStmt = db.prepare(`
    SELECT f.*,
           CASE WHEN dt.id IS NOT NULL THEN 1 ELSE 0 END as has_text,
           COALESCE(ds.word_count, 0) as word_count,
           CASE WHEN fb.file_id IS NOT NULL THEN 1 ELSE 0 END as has_blob
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    LEFT JOIN file_blobs fb ON fb.file_id = f.id
    ${whereClause}
    ORDER BY f.name ASC
    LIMIT ? OFFSET ?
  `);
  dataStmt.bind(dataParams);

  const files: FileResult[] = [];
  while (dataStmt.step()) {
    const row = dataStmt.getAsObject() as any;
    files.push({
      ...rowToFile(row),
      has_text: Number(row.has_text) === 1,
      word_count: Number(row.word_count),
      has_blob: Number(row.has_blob) === 1,
    });
  }
  dataStmt.free();

  return { files, total };
}

export function getFileById(id: number): (FileResult & { raw_text?: string; summary?: string; keywords?: string; topics?: string }) | null {
  const db = getDatabase();
  if (!db) return null;

  const stmt = db.prepare(`
    SELECT f.*, dt.raw_text, ds.summary, ds.keywords, ds.topics, ds.word_count,
           CASE WHEN dt.id IS NOT NULL THEN 1 ELSE 0 END as has_text,
           CASE WHEN fb.file_id IS NOT NULL THEN 1 ELSE 0 END as has_blob
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    LEFT JOIN file_blobs fb ON fb.file_id = f.id
    WHERE f.id = ?
  `);
  stmt.bind([id]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as any;
  stmt.free();

  return {
    ...rowToFile(row),
    raw_text: row.raw_text || undefined,
    summary: row.summary || undefined,
    keywords: row.keywords || undefined,
    topics: row.topics || undefined,
    has_blob: Number(row.has_blob) === 1,
  };
}

export function getCategories(): { name: string; count: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`SELECT category as name, COUNT(*) as count FROM files GROUP BY category ORDER BY category`);
  const results: { name: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({ name: String(row.name), count: Number(row.count) });
  }
  stmt.free();
  return results;
}

export function getFileTypes(): { extension: string; count: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`SELECT COALESCE(extension, 'sem_extensao') as extension, COUNT(*) as count FROM files GROUP BY extension ORDER BY count DESC`);
  const results: { extension: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({ extension: String(row.extension), count: Number(row.count) });
  }
  stmt.free();
  return results;
}

export function getAllDocuments(): FileResult[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM files ORDER BY id');
  const results: FileResult[] = [];
  while (stmt.step()) {
    results.push(rowToFile(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}

export function getRelatedDocuments(fileId: number, limit: number = 10): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT r.similarity_score, r.shared_keywords,
           f.id, f.name, f.extension, f.size_formatted, f.category
    FROM document_relations r
    JOIN files f ON (f.id = r.file_id_2 AND r.file_id_1 = ?) OR (f.id = r.file_id_1 AND r.file_id_2 = ?)
    WHERE r.similarity_score > 0
    ORDER BY r.similarity_score DESC
    LIMIT ?
  `);
  stmt.bind([fileId, fileId, limit]);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      score: Number(row.similarity_score),
      shared_keywords: row.shared_keywords,
      file: {
        id: Number(row.id),
        name: String(row.name),
        extension: row.extension,
        size_formatted: String(row.size_formatted),
        category: String(row.category),
      },
    });
  }
  stmt.free();
  return results;
}

export function getGraphData(): { nodes: any[]; edges: any[] } {
  const db = getDatabase();
  if (!db) return { nodes: [], edges: [] };

  const nodes: any[] = [];
  const edges: any[] = [];
  const addedFiles = new Set<number>();

  const fileStmt = db.prepare('SELECT id, name, extension, category, size_formatted FROM files ORDER BY id');
  while (fileStmt.step()) {
    const row = fileStmt.getAsObject() as any;
    nodes.push({
      id: Number(row.id),
      label: String(row.name),
      extension: row.extension,
      category: String(row.category),
      size: String(row.size_formatted),
    });
    addedFiles.add(Number(row.id));
  }
  fileStmt.free();

  const relStmt = db.prepare(`
    SELECT file_id_1, file_id_2, similarity_score, shared_keywords
    FROM document_relations
    WHERE similarity_score > 0.05
    ORDER BY similarity_score DESC
    LIMIT 500
  `);
  while (relStmt.step()) {
    const row = relStmt.getAsObject() as any;
    edges.push({
      from: Number(row.file_id_1),
      to: Number(row.file_id_2),
      value: Number(row.similarity_score),
      title: String(row.shared_keywords || ''),
    });
  }
  relStmt.free();

  return { nodes, edges };
}

export function getClusters(): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM document_clusters ORDER BY id');
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      name: String(row.name),
      description: String(row.description || ''),
      file_ids: String(row.file_ids || ''),
      theme_words: String(row.theme_words || ''),
    });
  }
  stmt.free();
  return results;
}

export function deleteFile(fileId: number): void {
  const db = getDatabase();
  if (!db) return;
  deleteFileBlob(fileId);
  db.run('DELETE FROM processing_queue WHERE file_id = ?', [fileId]);
  db.run('DELETE FROM document_relations WHERE file_id_1 = ? OR file_id_2 = ?', [fileId, fileId]);
  db.run('DELETE FROM document_sections WHERE file_id = ?', [fileId]);
  db.run('DELETE FROM document_vectors WHERE file_id = ?', [fileId]);
  db.run('DELETE FROM classification_feedback WHERE file_id = ?', [fileId]);
  db.run('DELETE FROM knowledge_relations WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?)', ['file', fileId, 'file', fileId]);
  db.run('DELETE FROM files WHERE id = ?', [fileId]);
  scheduleSave();
}

export function getFilesBySource(sourceId: number): Map<string, number> {
  const db = getDatabase();
  if (!db) return new Map();
  const stmt = db.prepare('SELECT id, full_path FROM files WHERE source_id = ?');
  stmt.bind([sourceId]);
  const map = new Map<string, number>();
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    map.set(String(row.full_path), Number(row.id));
  }
  stmt.free();
  return map;
}

export function updateFileSource(fileId: number, sourceId: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run('UPDATE files SET source_id = ? WHERE id = ?', [sourceId, fileId]);
  scheduleSave();
}

export function getDocumentsWithoutText(): { id: number; full_path: string; extension: string | null }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT f.id, f.full_path, f.extension
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    WHERE dt.id IS NULL
  `);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      full_path: String(row.full_path),
      extension: row.extension,
    });
  }
  stmt.free();
  return results;
}
