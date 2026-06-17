import { getDatabase, saveDatabase } from '../database';
import { SiteArea, SiteSnapshot, SiteSnapshotInput } from './types';

let saveTimeout: any = null;

function scheduleSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabase();
    saveTimeout = null;
  }, 1000);
}

export function ensureSiteSnapshotsTable(): void {
  const db = getDatabase();
  if (!db) return;

  db.run(`CREATE TABLE IF NOT EXISTS site_area_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area TEXT NOT NULL,
    page TEXT NOT NULL,
    agent TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    status TEXT,
    priority INTEGER DEFAULT 0,
    risk_level TEXT,
    payload TEXT,
    source_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run('CREATE INDEX IF NOT EXISTS idx_site_area_snapshots_area ON site_area_snapshots(area)');
  db.run('CREATE INDEX IF NOT EXISTS idx_site_area_snapshots_page ON site_area_snapshots(page)');
  db.run('CREATE INDEX IF NOT EXISTS idx_site_area_snapshots_agent ON site_area_snapshots(agent)');
  db.run('CREATE INDEX IF NOT EXISTS idx_site_area_snapshots_risk ON site_area_snapshots(risk_level)');
}

export function saveSiteSnapshot(snapshot: SiteSnapshotInput): SiteSnapshot | null {
  const db = getDatabase();
  if (!db) return null;
  ensureSiteSnapshotsTable();

  const now = new Date().toISOString();

  db.run('DELETE FROM site_area_snapshots WHERE area = ? AND page = ? AND agent = ?', [
    snapshot.area,
    snapshot.page,
    snapshot.agent,
  ]);

  db.run(`INSERT INTO site_area_snapshots (
    area, page, agent, title, summary, status, priority, risk_level, payload, source_count, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    snapshot.area,
    snapshot.page,
    snapshot.agent,
    snapshot.title,
    snapshot.summary,
    snapshot.status,
    snapshot.priority || 0,
    snapshot.riskLevel || null,
    snapshot.payload ? JSON.stringify(snapshot.payload) : null,
    snapshot.sourceCount || 0,
    now,
  ]);

  scheduleSave();

  return {
    ...snapshot,
    id: lastInsertId(),
    updatedAt: now,
  };
}

export function saveSiteSnapshots(snapshots: SiteSnapshotInput[]): SiteSnapshot[] {
  const saved: SiteSnapshot[] = [];
  for (const snapshot of snapshots) {
    const result = saveSiteSnapshot(snapshot);
    if (result) saved.push(result);
  }
  return saved;
}

export interface SiteSnapshotFilters {
  area?: SiteArea;
  page?: string;
  agent?: string;
  riskLevel?: string;
  limit?: number;
}

export function listSiteSnapshots(filters: SiteSnapshotFilters = {}): SiteSnapshot[] {
  const db = getDatabase();
  if (!db) return [];
  ensureSiteSnapshotsTable();

  const where: string[] = [];
  const params: any[] = [];

  if (filters.area) {
    where.push('area = ?');
    params.push(filters.area);
  }
  if (filters.page) {
    where.push('page = ?');
    params.push(filters.page);
  }
  if (filters.agent) {
    where.push('agent = ?');
    params.push(filters.agent);
  }
  if (filters.riskLevel) {
    where.push('risk_level = ?');
    params.push(filters.riskLevel);
  }

  const limit = Math.max(1, Math.min(filters.limit || 100, 500));
  const sql = `SELECT * FROM site_area_snapshots ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY priority DESC, updated_at DESC, id DESC LIMIT ${limit}`;
  const stmt = db.prepare(sql);
  stmt.bind(params);

  const snapshots: SiteSnapshot[] = [];
  while (stmt.step()) {
    snapshots.push(rowToSnapshot(stmt.getAsObject() as any));
  }
  stmt.free();

  return snapshots;
}

function rowToSnapshot(row: any): SiteSnapshot {
  return {
    id: Number(row.id),
    area: String(row.area) as SiteArea,
    page: String(row.page),
    agent: String(row.agent),
    title: String(row.title || ''),
    summary: String(row.summary || ''),
    status: String(row.status || 'ok') as any,
    priority: Number(row.priority || 0),
    riskLevel: row.risk_level ? String(row.risk_level) as any : null,
    payload: safeParseJson(row.payload) || {},
    sourceCount: Number(row.source_count || 0),
    updatedAt: String(row.updated_at || ''),
  };
}

function safeParseJson(value: any): any {
  if (!value) return null;
  try { return JSON.parse(String(value)); } catch { return null; }
}

function lastInsertId(): number {
  const db = getDatabase();
  if (!db) return 0;
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const id = Number((stmt.getAsObject() as any).id || 0);
  stmt.free();
  return id;
}
