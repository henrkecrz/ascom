import { getDatabase, scheduleSave } from './connection';
import { logger } from '../lib/logger';

export interface DataSource {
  id: number;
  path: string;
  type: 'documentos' | 'fotos';
  label: string;
  active: number;
  has_photos: number;
  last_scanned: string | null;
}

export function getDataSourceByPath(sourcePath: string): DataSource | null {
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM data_sources WHERE path = ?');
  stmt.bind([sourcePath]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as any;
  stmt.free();
  return {
    id: Number(row.id),
    path: String(row.path),
    type: String(row.type) as 'documentos' | 'fotos',
    label: String(row.label),
    active: Number(row.active),
    has_photos: Number(row.has_photos),
    last_scanned: row.last_scanned ? String(row.last_scanned) : null,
  };
}

export function getAllDataSources(onlyActive: boolean = false): DataSource[] {
  const db = getDatabase();
  if (!db) return [];
  const query = onlyActive
    ? 'SELECT * FROM data_sources WHERE active = 1 ORDER BY type, label'
    : 'SELECT * FROM data_sources ORDER BY type, label';
  const stmt = db.prepare(query);
  const results: DataSource[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      path: String(row.path),
      type: String(row.type) as 'documentos' | 'fotos',
      label: String(row.label),
      active: Number(row.active),
      has_photos: Number(row.has_photos),
      last_scanned: row.last_scanned ? String(row.last_scanned) : null,
    });
  }
  stmt.free();
  return results;
}

export function insertDataSource(source: { path: string; type: string; label: string; has_photos?: number }): number {
  const db = getDatabase();
  if (!db) return 0;
  try {
    db.run(
      'INSERT INTO data_sources (path, type, label, active, has_photos) VALUES (?, ?, ?, 1, ?)',
      [source.path, source.type, source.label, source.has_photos || 0]
    );
    scheduleSave();
    const result = db.exec('SELECT last_insert_rowid() as id');
    if (result.length > 0 && result[0].values.length > 0) {
      return Number(result[0].values[0][0]);
    }
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE')) {
      logger.warn(`Tentativa de inserir fonte duplicada: ${source.path}`);
      return 0;
    }
    throw err;
  }
  return 0;
}

export function updateDataSource(id: number, data: { path?: string; label?: string; active?: number; has_photos?: number }): void {
  const db = getDatabase();
  if (!db) return;
  const sets: string[] = [];
  const params: any[] = [];
  if (data.path !== undefined) { sets.push('path = ?'); params.push(data.path); }
  if (data.label !== undefined) { sets.push('label = ?'); params.push(data.label); }
  if (data.active !== undefined) { sets.push('active = ?'); params.push(data.active); }
  if (data.has_photos !== undefined) { sets.push('has_photos = ?'); params.push(data.has_photos); }
  if (sets.length === 0) return;
  params.push(id);
  db.run(`UPDATE data_sources SET ${sets.join(', ')} WHERE id = ?`, params);
  scheduleSave();
}

export function deleteDataSource(id: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM data_sources WHERE id = ?', [id]);
  scheduleSave();
}

export function updateLastScanned(id: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run("UPDATE data_sources SET last_scanned = ? WHERE id = ?", [new Date().toISOString(), id]);
  scheduleSave();
}
