import { getDatabase, scheduleSave } from './connection';

export interface ImportHistoryRecord {
  id?: number;
  source_id: number;
  file_id: number;
  table_name: string;
  rows_inserted: number;
  imported_at?: string;
  status?: 'active' | 'undone';
}

export function insertImportHistory(record: ImportHistoryRecord): number {
  const db = getDatabase();
  if (!db) return 0;
  
  db.run(`INSERT INTO import_history (source_id, file_id, table_name, rows_inserted, imported_at, status)
    VALUES (?, ?, ?, ?, ?, 'active')`,
    [record.source_id, record.file_id, record.table_name, record.rows_inserted, new Date().toISOString()]);
    
  const result = db.exec('SELECT last_insert_rowid() as id');
  scheduleSave();
  if (result.length > 0 && result[0].values.length > 0) {
    return Number(result[0].values[0][0]);
  }
  return 0;
}

export function getImportHistory(limit: number = 50): ImportHistoryRecord[] {
  const db = getDatabase();
  if (!db) return [];
  
  const stmt = db.prepare('SELECT * FROM import_history ORDER BY id DESC LIMIT ?');
  stmt.bind([limit]);
  const results: ImportHistoryRecord[] = [];
  
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      source_id: Number(row.source_id),
      file_id: Number(row.file_id),
      table_name: String(row.table_name),
      rows_inserted: Number(row.rows_inserted),
      imported_at: String(row.imported_at),
      status: String(row.status) as 'active' | 'undone'
    });
  }
  stmt.free();
  return results;
}

export function markImportUndone(id: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run("UPDATE import_history SET status = 'undone' WHERE id = ?", [id]);
  scheduleSave();
}

export function getImportHistoryById(id: number): ImportHistoryRecord | null {
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM import_history WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as any;
    stmt.free();
    return {
      id: Number(row.id),
      source_id: Number(row.source_id),
      file_id: Number(row.file_id),
      table_name: String(row.table_name),
      rows_inserted: Number(row.rows_inserted),
      imported_at: String(row.imported_at),
      status: String(row.status) as 'active' | 'undone'
    };
  }
  stmt.free();
  return null;
}
