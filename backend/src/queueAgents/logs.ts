import { getDatabase, saveDatabase } from '../database';
import { QueueAgentResult, QueueAgentStage } from './types';

let saveTimeout: any = null;

function scheduleSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabase();
    saveTimeout = null;
  }, 2000);
}

export function ensureQueueAgentLogTable(): void {
  const db = getDatabase();
  if (!db) return;

  db.run(`CREATE TABLE IF NOT EXISTS queue_agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue_item_id INTEGER,
    file_id INTEGER,
    stage TEXT NOT NULL,
    agent TEXT NOT NULL,
    status TEXT NOT NULL,
    confidence REAL,
    risk_level TEXT,
    summary TEXT,
    recommended_action TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run('CREATE INDEX IF NOT EXISTS idx_queue_agent_logs_file ON queue_agent_logs(file_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_queue_agent_logs_stage ON queue_agent_logs(stage)');
  db.run('CREATE INDEX IF NOT EXISTS idx_queue_agent_logs_agent ON queue_agent_logs(agent)');
  db.run('CREATE INDEX IF NOT EXISTS idx_queue_agent_logs_risk ON queue_agent_logs(risk_level)');
}

export function insertQueueAgentLog(queueItemId: number, fileId: number, result: QueueAgentResult): void {
  const db = getDatabase();
  if (!db) return;
  ensureQueueAgentLogTable();

  db.run(`INSERT INTO queue_agent_logs (
    queue_item_id, file_id, stage, agent, status, confidence, risk_level,
    summary, recommended_action, metadata, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    queueItemId,
    fileId,
    result.stage,
    result.agent,
    result.status,
    result.confidence ?? null,
    result.riskLevel || null,
    result.summary || null,
    result.recommendedAction || null,
    result.metadata ? JSON.stringify(result.metadata) : null,
    new Date().toISOString(),
  ]);

  scheduleSave();
}

export interface QueueAgentLogFilters {
  fileId?: number;
  stage?: QueueAgentStage;
  agent?: string;
  riskLevel?: string;
  limit?: number;
}

export function listQueueAgentLogs(filters: QueueAgentLogFilters = {}) {
  const db = getDatabase();
  if (!db) return [];
  ensureQueueAgentLogTable();

  const where: string[] = [];
  const params: any[] = [];

  if (filters.fileId !== undefined) {
    where.push('file_id = ?');
    params.push(filters.fileId);
  }
  if (filters.stage) {
    where.push('stage = ?');
    params.push(filters.stage);
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
  const sql = `SELECT * FROM queue_agent_logs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
  const stmt = db.prepare(sql);
  stmt.bind(params);

  const rows: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    rows.push({
      id: Number(row.id),
      queueItemId: row.queue_item_id !== null ? Number(row.queue_item_id) : null,
      fileId: row.file_id !== null ? Number(row.file_id) : null,
      stage: String(row.stage),
      agent: String(row.agent),
      status: String(row.status),
      confidence: row.confidence !== null && row.confidence !== undefined ? Number(row.confidence) : null,
      riskLevel: row.risk_level ? String(row.risk_level) : null,
      summary: row.summary ? String(row.summary) : '',
      recommendedAction: row.recommended_action ? String(row.recommended_action) : '',
      metadata: safeParseJson(row.metadata),
      createdAt: String(row.created_at || ''),
    });
  }
  stmt.free();
  return rows;
}

function safeParseJson(value: any) {
  if (!value) return null;
  try { return JSON.parse(String(value)); } catch { return null; }
}
