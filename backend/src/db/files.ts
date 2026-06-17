import fs from 'fs';
import path from 'path';
import { getDatabase, scheduleSave } from './connection';
import { logger } from '../lib/logger';

export interface FileQuery {
  category?: string;
  extension?: string;
  search?: string;
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
  has_text: boolean;
  doc_type: string;
  doc_type_confidence: number;
  plan_section: string;
  entities?: string;
}

const DEFAULT_QUERY_LIMIT = 50;
const MAX_QUERY_LIMIT = 100;

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
  try {
    const blobsDir = path.join(process.cwd(), 'data', 'blobs');
    return fs.existsSync(path.join(blobsDir, `${fileId}.bin`));
  } catch {
    return false;
  }
}

export function deleteFileBlob(fileId: number): void {
  const db = getDatabase();
  try {
    const blobsDir = path.join(process.cwd(), 'data', 'blobs');
    const filePath = path.join(blobsDir, `${fileId}.bin`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (db) db.run('DELETE FROM file_blobs WHERE file_id = ?', [fileId]);
  } catch (err) {
    logger.error(`Erro ao apagar blob do arquivo ${fileId}`, err);
  }
}

function mapFileRow(row: any): FileResult {
  return {
    id: Number(row.id),
    name: String(row.name),
    full_path: String(row.full_path),
    relative_path: String(row.relative_path),
    extension: row.extension ? String(row.extension) : null,
    size_bytes: Number(row.size_bytes || 0),
    size_formatted: String(row.size_formatted || ''),
    last_modified: String(row.last_modified || ''),
    category: String(row.category || ''),
    parent_folder: String(row.parent_folder || ''),
    depth: Number(row.depth || 0),
    has_text: Number(row.has_text || 0) > 0,
    doc_type: String(row.doc_type || 'outro'),
    doc_type_confidence: Number(row.doc_type_confidence || 0),
    plan_section: String(row.plan_section || ''),
    entities: String(row.entities || '{}'),
  };
}

export function queryFiles(query: FileQuery = {}): { items: FileResult[]; total: number } {
  const db = getDatabase();
  if (!db) return { items: [], total: 0 };

  const conditions: string[] = [];
  const params: any[] = [];
  if (query.category) { conditions.push('f.category = ?'); params.push(query.category); }
  if (query.extension) { conditions.push('f.extension = ?'); params.push(query.extension); }
  if (query.search) { conditions.push('(f.name LIKE ? OR f.relative_path LIKE ? OR f.category LIKE ?)'); params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Math.max(Number(query.limit || DEFAULT_QUERY_LIMIT), 1), MAX_QUERY_LIMIT);
  const offset = Math.max(Number(query.offset || 0), 0);

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM files f ${where}`);
  countStmt.bind(params);
  const total = countStmt.step() ? Number(countStmt.getAsObject().total || 0) : 0;
  countStmt.free();

  const stmt = db.prepare(`
    SELECT f.*, CASE WHEN dt.id IS NULL THEN 0 ELSE 1 END as has_text
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    ${where}
    ORDER BY f.last_modified DESC
    LIMIT ? OFFSET ?
  `);
  stmt.bind([...params, limit, offset]);
  const items: FileResult[] = [];
  while (stmt.step()) items.push(mapFileRow(stmt.getAsObject() as any));
  stmt.free();
  return { items, total };
}

export function getFileById(id: number): FileResult | null {
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare(`
    SELECT f.*, CASE WHEN dt.id IS NULL THEN 0 ELSE 1 END as has_text
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    WHERE f.id = ?
  `);
  stmt.bind([id]);
  const result = stmt.step() ? mapFileRow(stmt.getAsObject() as any) : null;
  stmt.free();
  return result;
}

export function getCategories(): { name: string; count: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT category as name, COUNT(*) as count FROM files GROUP BY category ORDER BY count DESC');
  const result: { name: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    result.push({ name: String(row.name), count: Number(row.count) });
  }
  stmt.free();
  return result;
}

export function getFileTypes(): { extension: string; count: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT extension, COUNT(*) as count FROM files GROUP BY extension ORDER BY count DESC');
  const result: { extension: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    result.push({ extension: String(row.extension || 'sem extensão'), count: Number(row.count) });
  }
  stmt.free();
  return result;
}

export function getAllDocuments(): FileResult[] {
  return queryFiles({ limit: 100 }).items;
}

export function getRelatedDocuments(fileId: number): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT f.*, dr.similarity_score, dr.shared_keywords
    FROM document_relations dr
    JOIN files f ON f.id = CASE WHEN dr.file_id_1 = ? THEN dr.file_id_2 ELSE dr.file_id_1 END
    WHERE dr.file_id_1 = ? OR dr.file_id_2 = ?
    ORDER BY dr.similarity_score DESC
    LIMIT 10
  `);
  stmt.bind([fileId, fileId, fileId]);
  const results: any[] = [];
  while (stmt.step()) results.push(stmt.getAsObject() as any);
  stmt.free();
  return results;
}

export function getGraphData(): { nodes: any[]; edges: any[] } {
  const db = getDatabase();
  if (!db) return { nodes: [], edges: [] };
  const nodes: any[] = [];
  const edges: any[] = [];
  const addedFiles = new Set<number>();

  const fileStmt = db.prepare('SELECT id, name, extension, category, size_formatted FROM files ORDER BY id LIMIT 500');
  while (fileStmt.step()) {
    const row = fileStmt.getAsObject() as any;
    nodes.push({ id: Number(row.id), label: String(row.name), extension: row.extension, category: String(row.category), size: String(row.size_formatted) });
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
    edges.push({ from: Number(row.file_id_1), to: Number(row.file_id_2), value: Number(row.similarity_score), title: String(row.shared_keywords || '') });
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
    results.push({ id: Number(row.id), name: String(row.name), description: String(row.description || ''), file_ids: String(row.file_ids || ''), theme_words: String(row.theme_words || '') });
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
  db.run('DELETE FROM source_file_state WHERE file_id = ?', [fileId]);
  db.run('DELETE FROM document_change_alerts WHERE change_event_id IN (SELECT id FROM document_change_events WHERE file_id = ?)', [fileId]);
  db.run('DELETE FROM document_change_events WHERE file_id = ?', [fileId]);
  db.run('DELETE FROM document_versions WHERE file_id = ?', [fileId]);
  db.run('DELETE FROM knowledge_relations WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?)', ['file', fileId, 'file', fileId]);
  db.run('DELETE FROM files WHERE id = ?', [fileId]);
  scheduleSave();
}

export function getFilesBySource(sourceId: number): Map<string, number> {
  const db = getDatabase();
  if (!db) return new Map();
  const stmt = db.prepare(`
    SELECT f.id, COALESCE(sfs.source_path, f.full_path) as source_path
    FROM files f
    LEFT JOIN source_file_state sfs ON sfs.file_id = f.id
    WHERE f.source_id = ?
  `);
  stmt.bind([sourceId]);
  const map = new Map<string, number>();
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    map.set(String(row.source_path), Number(row.id));
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
    results.push({ id: Number(row.id), full_path: String(row.full_path), extension: row.extension ? String(row.extension) : null });
  }
  stmt.free();
  return results;
}
