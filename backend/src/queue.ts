import { getDatabase, saveDatabase } from './database';
import { logger } from './lib/logger';

export type QueueStage = 'extract' | 'analyze' | 'structure' | 'relations' | 'clusters' | 'knowledge' | 'simulator';
export type QueueStatus = 'pending' | 'processing' | 'done' | 'error' | 'skipped' | 'dead_letter';

export interface QueueItem {
  id: number;
  file_id: number;
  stage: QueueStage;
  status: QueueStatus;
  priority: number;
  retry_count: number;
  max_retries: number;
  error_message: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export function ensureQueueTable(): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`CREATE TABLE IF NOT EXISTS processing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    stage TEXT NOT NULL DEFAULT 'extract',
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pq_status ON processing_queue(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pq_file ON processing_queue(file_id)`);
}

export function enqueueFile(fileId: number, priority: number = 0, skipSave?: boolean): void {
  const db = getDatabase();
  if (!db) return;
  const now = new Date().toISOString();
  for (const stage of ['extract', 'analyze', 'structure'] as QueueStage[]) {
    const existing = db.prepare('SELECT id FROM processing_queue WHERE file_id = ? AND stage = ? AND status IN (?, ?)');
    existing.bind([fileId, stage, 'pending', 'error']);
    const found = existing.step();
    existing.free();
    if (found) continue;
    db.run(`INSERT INTO processing_queue (file_id, stage, status, priority, max_retries, created_at)
      VALUES (?, ?, 'pending', ?, 3, ?)`, [fileId, stage, priority, now]);
  }
  if (!skipSave) scheduleSave();
}

export function enqueueAllFiles(): { total: number } {
  const db = getDatabase();
  if (!db) return { total: 0 };
  const stmt = db.prepare('SELECT id FROM files ORDER BY id');
  const ids: number[] = [];
  while (stmt.step()) ids.push(Number(stmt.getAsObject().id));
  stmt.free();
  for (const id of ids) enqueueFile(id, 0, true);
  scheduleSave();
  return { total: ids.length };
}

export function enqueueGlobalStages(): void {
  const db = getDatabase();
  if (!db) return;
  const now = new Date().toISOString();
  const stages = ['relations', 'clusters', 'knowledge', 'simulator'] as QueueStage[];
  for (const stage of stages) {
    const existing = db.prepare('SELECT id FROM processing_queue WHERE stage = ? AND status = ?');
    existing.bind([stage, 'pending']);
    if (existing.step()) { existing.free(); continue; }
    existing.free();
    db.run(`INSERT INTO processing_queue (file_id, stage, status, priority, max_retries, created_at)
      VALUES (0, ?, 'pending', -1, 3, ?)`, [stage, now]);
  }
  scheduleSave();
}

export function getNextPending(): QueueItem | null {
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare(`SELECT * FROM processing_queue
    WHERE status = 'pending' AND retry_count < max_retries
    ORDER BY priority DESC, id ASC LIMIT 1`);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject() as any;
  stmt.free();
  return rowToQueueItem(row);
}

export function claimItem(id: number): boolean {
  const db = getDatabase();
  if (!db) return false;
  const now = new Date().toISOString();
  db.run(`UPDATE processing_queue SET status = 'processing', started_at = ? WHERE id = ? AND status = 'pending'`, [now, id]);
  scheduleSave();
  return true;
}

export function completeItem(id: number, status: QueueStatus = 'done', error?: string): void {
  const db = getDatabase();
  if (!db) return;
  const now = new Date().toISOString();
  if (status === 'error') {
    db.run(`UPDATE processing_queue SET status = ?, error_message = ?, retry_count = retry_count + 1, completed_at = ?
      WHERE id = ?`, [status, error || '', now, id]);
    const check = db.prepare('SELECT retry_count, max_retries FROM processing_queue WHERE id = ?');
    check.bind([id]);
    if (check.step()) {
      const row = check.getAsObject() as any;
      if (Number(row.retry_count) >= Number(row.max_retries)) {
        db.run(`UPDATE processing_queue SET status = 'dead_letter' WHERE id = ?`, [id]);
      }
    }
    check.free();
  } else {
    db.run(`UPDATE processing_queue SET status = ?, completed_at = ? WHERE id = ?`, [status, now, id]);
  }
  scheduleSave();
}

export function getQueueStats(): { pending: number; processing: number; done: number; error: number; total: number } {
  const db = getDatabase();
  if (!db) return { pending: 0, processing: 0, done: 0, error: 0, total: 0 };
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
    FROM processing_queue
  `);
  stmt.step();
  const row = stmt.getAsObject() as any;
  stmt.free();
  return {
    total: Number(row.total),
    pending: Number(row.pending || 0),
    processing: Number(row.processing || 0),
    done: Number(row.done || 0),
    error: Number(row.error || 0),
  };
}

export function getQueueProgress(): { stage: string; done: number; pending: number; error: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT stage,
      SUM(CASE WHEN status IN ('done', 'skipped') THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
    FROM processing_queue
    GROUP BY stage ORDER BY stage
  `);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      stage: String(row.stage),
      done: Number(row.done),
      pending: Number(row.pending),
      error: Number(row.error),
    });
  }
  stmt.free();
  return results;
}

export function clearQueue(): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM processing_queue');
  saveDatabase();
}

export function getDeadLetterItems(): QueueItem[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`SELECT * FROM processing_queue WHERE status = 'dead_letter' ORDER BY completed_at DESC`);
  const items: QueueItem[] = [];
  while (stmt.step()) {
    items.push(rowToQueueItem(stmt.getAsObject() as any));
  }
  stmt.free();
  return items;
}

export function requeueDeadLetterItem(id: number): boolean {
  const db = getDatabase();
  if (!db) return false;
  db.run(`UPDATE processing_queue SET status = 'pending', retry_count = 0, error_message = NULL, started_at = NULL, completed_at = NULL WHERE id = ? AND status = 'dead_letter'`, [id]);
  scheduleSave();
  return true;
}

export function purgeDeadLetterQueue(): number {
  const db = getDatabase();
  if (!db) return 0;
  const stmt = db.prepare(`DELETE FROM processing_queue WHERE status = 'dead_letter'`);
  stmt.step();
  stmt.free();
  scheduleSave();
  return db.getRowsModified();
}

export function getExponentialDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 30000);
}

function rowToQueueItem(row: any): QueueItem {
  return {
    id: Number(row.id),
    file_id: Number(row.file_id),
    stage: String(row.stage) as QueueStage,
    status: String(row.status) as QueueStatus,
    priority: Number(row.priority),
    retry_count: Number(row.retry_count),
    max_retries: Number(row.max_retries),
    error_message: String(row.error_message || ''),
    created_at: String(row.created_at || ''),
    started_at: row.started_at ? String(row.started_at) : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
  };
}

let saveTimeout: any = null;
function scheduleSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => { saveDatabase(); saveTimeout = null; }, 2000);
}
