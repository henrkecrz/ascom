import { getDatabase, saveDatabase } from './connection';

export interface ScenarioOption {
  id: string;
  text: string;
  points: number;
  feedback: string;
}

export interface Scenario {
  id: number;
  title: string;
  description: string;
  options: ScenarioOption[];
  difficulty: string;
  category: string;
  source: string;
  created_at: string;
}

export function ensureSimulatorTable(): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`CREATE TABLE IF NOT EXISTS simulator_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    options TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medio',
    category TEXT DEFAULT 'geral',
    source TEXT DEFAULT 'ai',
    created_at TEXT
  )`);
}

export function insertScenario(s: Omit<Scenario, 'id' | 'created_at'>): number {
  const db = getDatabase();
  if (!db) return 0;
  const now = new Date().toISOString();
  db.run(`INSERT INTO simulator_scenarios (title, description, options, difficulty, category, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [s.title, s.description, JSON.stringify(s.options), s.difficulty, s.category, s.source, now]);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  if (r.length > 0 && r[0].values.length > 0) return Number(r[0].values[0][0]);
  return 0;
}

export function getScenarios(category?: string): Scenario[] {
  const db = getDatabase();
  if (!db) return [];
  const sql = category
    ? 'SELECT * FROM simulator_scenarios WHERE category = ? ORDER BY id DESC'
    : 'SELECT * FROM simulator_scenarios ORDER BY id DESC';
  const stmt = db.prepare(sql);
  if (category) stmt.bind([category]);
  const results: Scenario[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      title: String(row.title),
      description: String(row.description),
      options: JSON.parse(String(row.options || '[]')),
      difficulty: String(row.difficulty || 'medio'),
      category: String(row.category || 'geral'),
      source: String(row.source || 'ai'),
      created_at: String(row.created_at || ''),
    });
  }
  stmt.free();
  return results;
}

export function getScenarioCategories(): { category: string; count: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT category, COUNT(*) as count FROM simulator_scenarios GROUP BY category ORDER BY count DESC');
  const results: { category: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({ category: String(row.category), count: Number(row.count) });
  }
  stmt.free();
  return results;
}

export function deleteScenario(id: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM simulator_scenarios WHERE id = ?', [id]);
  saveDatabase();
}
