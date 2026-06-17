import { getDatabase, saveDatabase } from './connection';

export interface TalkingPoint {
  id: number;
  title: string;
  category: string;
  approved: string[];
  restricted: string[];
  source: string;
  created_at: string;
}

export function ensureTalkingPointsTable(): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`CREATE TABLE IF NOT EXISTS talking_points_matrix (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'geral',
    approved TEXT NOT NULL,
    restricted TEXT NOT NULL,
    source TEXT DEFAULT 'ai',
    created_at TEXT
  )`);
}

export function insertTalkingPoint(tp: Omit<TalkingPoint, 'id' | 'created_at'>): number {
  const db = getDatabase();
  if (!db) return 0;
  const now = new Date().toISOString();
  db.run(`INSERT INTO talking_points_matrix (title, category, approved, restricted, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [tp.title, tp.category, JSON.stringify(tp.approved), JSON.stringify(tp.restricted), tp.source, now]);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  if (r.length > 0 && r[0].values.length > 0) return Number(r[0].values[0][0]);
  return 0;
}

export function getTalkingPoints(category?: string): TalkingPoint[] {
  const db = getDatabase();
  if (!db) return [];
  let sql = 'SELECT * FROM talking_points_matrix';
  const params: any[] = [];
  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }
  sql += ' ORDER BY id ASC';
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: TalkingPoint[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      title: String(row.title),
      category: String(row.category || 'geral'),
      approved: JSON.parse(String(row.approved || '[]')),
      restricted: JSON.parse(String(row.restricted || '[]')),
      source: String(row.source || 'ai'),
      created_at: String(row.created_at || ''),
    });
  }
  stmt.free();
  return results;
}

export function getTalkingPointCategories(): { category: string; count: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT category, COUNT(*) as count FROM talking_points_matrix GROUP BY category ORDER BY count DESC');
  const results: { category: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({ category: String(row.category), count: Number(row.count) });
  }
  stmt.free();
  return results;
}
