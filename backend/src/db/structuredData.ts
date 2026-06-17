import { getDatabase, scheduleSave, saveDatabase, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT } from './connection';

export function insertStructuredData(entry: {
  source_file_id: number;
  schema_type: string;
  data: any;
  theme?: string;
  confidence?: number;
}): number {
  const db = getDatabase();
  if (!db) return 0;
  
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(JSON.stringify(entry.data)).digest('hex');

  db.run(`INSERT OR IGNORE INTO structured_data (source_file_id, schema_type, data, theme, confidence, imported_at, row_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entry.source_file_id, entry.schema_type, JSON.stringify(entry.data), entry.theme || '', entry.confidence || 0, new Date().toISOString(), hash]);
  
  const changesStmt = db.prepare('SELECT changes() as c');
  changesStmt.step();
  const changes = Number(changesStmt.getAsObject().c);
  changesStmt.free();
  
  if (changes > 0) {
    const result = db.exec('SELECT last_insert_rowid() as id');
    scheduleSave();
    if (result.length > 0 && result[0].values.length > 0) {
      return Number(result[0].values[0][0]);
    }
  }
  return 0;
}

export function queryStructuredData(filters: {
  schema_type?: string;
  theme?: string;
  source_file_id?: number;
  limit?: number;
  offset?: number;
}): { data: any[]; total: number } {
  const db = getDatabase();
  if (!db) return { data: [], total: 0 };
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.schema_type) { conditions.push('schema_type = ?'); params.push(filters.schema_type); }
  if (filters.theme) { conditions.push('theme = ?'); params.push(filters.theme); }
  if (filters.source_file_id) { conditions.push('source_file_id = ?'); params.push(filters.source_file_id); }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM structured_data ${where}`);
  if (params.length > 0) countStmt.bind(params);
  countStmt.step();
  const total = Number(countStmt.getAsObject().total);
  countStmt.free();
  const limit = Math.min(filters.limit || DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
  const offset = filters.offset || 0;
  const stmt = db.prepare(`SELECT * FROM structured_data ${where} ORDER BY id DESC LIMIT ? OFFSET ?`);
  stmt.bind([...params, limit, offset]);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      source_file_id: Number(row.source_file_id),
      schema_type: String(row.schema_type),
      data: (() => { try { return JSON.parse(String(row.data)); } catch { return {}; } })(),
      theme: String(row.theme || ''),
      confidence: Number(row.confidence),
      imported_at: String(row.imported_at || ''),
    });
  }
  stmt.free();
  return { data: results, total };
}

export function deleteStructuredData(id: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM structured_data WHERE id = ?', [id]);
  saveDatabase();
}
