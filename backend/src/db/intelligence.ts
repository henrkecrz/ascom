import { getDatabase, scheduleSave } from './connection';

export type ImpactLevel = 'baixo' | 'medio' | 'alto' | 'critico';

export interface DocumentVersion {
  id: number;
  file_id: number;
  version_number: number;
  md5_hash: string;
  source_path: string;
  cache_path: string;
  size_bytes: number;
  last_modified: string;
  raw_text: string;
  summary: string;
  keywords: string;
  doc_type: string;
  plan_section: string;
  entities: string;
  created_at: string;
}

export interface DocumentChangeEvent {
  id: number;
  file_id: number;
  old_version_id?: number;
  new_version_id?: number;
  change_type: string;
  impact_level: ImpactLevel;
  summary: string;
  diff_payload: string;
  affected_modules: string;
  recommended_action: string;
  status: string;
  detected_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

function rows(stmt: any): any[] {
  const result: any[] = [];
  while (stmt.step()) result.push(stmt.getAsObject());
  stmt.free();
  return result;
}

function one(stmt: any): any | null {
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function ensureIntelligenceTables(): void {
  const db = getDatabase();
  if (!db) return;

  db.run(`CREATE TABLE IF NOT EXISTS document_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    md5_hash TEXT,
    source_path TEXT,
    cache_path TEXT,
    size_bytes INTEGER,
    last_modified TEXT,
    raw_text TEXT,
    summary TEXT,
    keywords TEXT,
    doc_type TEXT,
    plan_section TEXT,
    entities TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS document_change_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    old_version_id INTEGER,
    new_version_id INTEGER,
    change_type TEXT NOT NULL,
    impact_level TEXT DEFAULT 'baixo',
    summary TEXT,
    diff_payload TEXT,
    affected_modules TEXT,
    recommended_action TEXT,
    status TEXT DEFAULT 'detected',
    detected_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT,
    reviewed_by TEXT,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS document_change_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    change_event_id INTEGER NOT NULL,
    alert_title TEXT NOT NULL,
    alert_message TEXT,
    alert_level TEXT DEFAULT 'info',
    target_area TEXT,
    target_page TEXT,
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY(change_event_id) REFERENCES document_change_events(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS source_file_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    source_id INTEGER,
    source_path TEXT NOT NULL,
    cache_path TEXT,
    md5_hash TEXT,
    last_seen_at TEXT,
    last_modified TEXT,
    exists_on_source INTEGER DEFAULT 1,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT,
    source TEXT,
    risk_level TEXT,
    opportunity_level TEXT,
    related_file_ids TEXT,
    related_photo_event_ids TEXT,
    related_change_event_ids TEXT,
    status TEXT DEFAULT 'suggested',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS calendar_content_opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_date TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    suggested_format TEXT,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'suggested',
    source_payload TEXT,
    related_change_event_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photo_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER,
    event_id INTEGER,
    usage_type TEXT NOT NULL,
    usage_title TEXT,
    usage_url TEXT,
    used_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY(photo_id) REFERENCES photos(id),
    FOREIGN KEY(event_id) REFERENCES photo_events(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photo_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    confidence REAL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(photo_id) REFERENCES photos(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photo_highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL,
    event_id INTEGER,
    highlight_type TEXT NOT NULL,
    score REAL DEFAULT 0,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(photo_id) REFERENCES photos(id),
    FOREIGN KEY(event_id) REFERENCES photo_events(id)
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_dv_file ON document_versions(file_id, version_number)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dce_file ON document_change_events(file_id, detected_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dce_impact ON document_change_events(impact_level, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dca_resolved ON document_change_alerts(resolved, alert_level)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sfs_source_path ON source_file_state(source_path)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_opps_date ON calendar_content_opportunities(opportunity_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_photo_usage_photo ON photo_usage(photo_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_photo_tags_photo ON photo_tags(photo_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_photo_highlights_event ON photo_highlights(event_id)`);
}

function latestVersionNumber(fileId: number): number {
  const db = getDatabase();
  if (!db) return 0;
  const stmt = db.prepare('SELECT MAX(version_number) as max_version FROM document_versions WHERE file_id = ?');
  stmt.bind([fileId]);
  const row = one(stmt);
  return Number(row?.max_version || 0);
}

export function getLatestDocumentVersion(fileId: number): DocumentVersion | null {
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM document_versions WHERE file_id = ? ORDER BY version_number DESC LIMIT 1');
  stmt.bind([fileId]);
  return one(stmt) as DocumentVersion | null;
}

export function createDocumentVersion(fileId: number): DocumentVersion | null {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;

  const fileStmt = db.prepare(`
    SELECT f.*, dt.raw_text, ds.summary, ds.keywords
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    WHERE f.id = ?
  `);
  fileStmt.bind([fileId]);
  const file = one(fileStmt);
  if (!file) return null;

  const rawText = String(file.raw_text || '');
  const summary = String(file.summary || '');
  const keywords = String(file.keywords || '');
  if (!rawText && !summary && !keywords && !file.md5_hash) return null;

  const versionNumber = latestVersionNumber(fileId) + 1;
  db.run(`INSERT INTO document_versions (
    file_id, version_number, md5_hash, source_path, cache_path, size_bytes, last_modified,
    raw_text, summary, keywords, doc_type, plan_section, entities, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    fileId,
    versionNumber,
    String(file.md5_hash || ''),
    String(file.source_path || file.full_path || ''),
    String(file.cache_path || ''),
    Number(file.size_bytes || 0),
    String(file.last_modified || ''),
    rawText,
    summary,
    keywords,
    String(file.doc_type || 'outro'),
    String(file.plan_section || ''),
    String(file.entities || '{}'),
    new Date().toISOString(),
  ]);
  scheduleSave();
  return getLatestDocumentVersion(fileId);
}

function textSimilarity(a: string, b: string): number {
  const aw = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const bw = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (aw.size === 0 && bw.size === 0) return 1;
  const union = new Set([...aw, ...bw]);
  let intersection = 0;
  for (const word of aw) if (bw.has(word)) intersection++;
  return union.size === 0 ? 0 : intersection / union.size;
}

function inferChangeType(oldV: DocumentVersion | null, newV: DocumentVersion): string {
  if (!oldV) return 'novo_documento';
  if (oldV.doc_type !== newV.doc_type) return 'classificacao';
  if (oldV.plan_section !== newV.plan_section) return 'metadado';
  const oldEntities = parseJson<any>(oldV.entities, {});
  const newEntities = parseJson<any>(newV.entities, {});
  if (JSON.stringify(oldEntities) !== JSON.stringify(newEntities)) return 'conteudo_textual';
  return 'conteudo_textual';
}

function impactForChange(oldV: DocumentVersion | null, newV: DocumentVersion, similarity: number): ImpactLevel {
  const sensitiveTypes = new Set(['protocolo_crise', 'porta_voz', 'assunto_sensivel', 'normativa_diretriz']);
  if (!oldV) return sensitiveTypes.has(newV.doc_type) ? 'alto' : 'medio';
  if (sensitiveTypes.has(oldV.doc_type) || sensitiveTypes.has(newV.doc_type)) return similarity < 0.75 ? 'critico' : 'alto';
  if (oldV.doc_type !== newV.doc_type || oldV.plan_section !== newV.plan_section) return 'alto';
  if (similarity < 0.55) return 'alto';
  if (similarity < 0.85) return 'medio';
  return 'baixo';
}

function affectedModulesForChange(changeType: string, impact: ImpactLevel): string[] {
  const modules = new Set(['documentos', 'busca', 'timeline']);
  if (impact === 'alto' || impact === 'critico') modules.add('painel');
  if (['protocolo_crise', 'porta_voz', 'assunto_sensivel', 'classificacao'].includes(changeType) || impact === 'critico') modules.add('crise');
  if (['conteudo_textual', 'classificacao', 'metadado'].includes(changeType)) modules.add('calendario');
  modules.add('galeria');
  modules.add('relatorios');
  modules.add('site_agents');
  return Array.from(modules);
}

export function createChangeEventFromVersions(fileId: number, oldVersion: DocumentVersion | null, newVersion: DocumentVersion): DocumentChangeEvent | null {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;

  const similarity = oldVersion ? textSimilarity(oldVersion.raw_text || '', newVersion.raw_text || '') : 0;
  if (oldVersion && oldVersion.md5_hash === newVersion.md5_hash && similarity > 0.98) return null;

  const changeType = inferChangeType(oldVersion, newVersion);
  const impact = impactForChange(oldVersion, newVersion, similarity);
  const affectedModules = affectedModulesForChange(changeType, impact);
  const summary = oldVersion
    ? `Documento atualizado. Similaridade textual aproximada: ${Math.round(similarity * 100)}%. Tipo: ${oldVersion.doc_type} → ${newVersion.doc_type}. Seção: ${oldVersion.plan_section || '—'} → ${newVersion.plan_section || '—'}.`
    : `Novo documento incorporado à base. Tipo: ${newVersion.doc_type || 'outro'}. Seção: ${newVersion.plan_section || '—'}.`;
  const recommendedAction = impact === 'critico'
    ? 'Revisar imediatamente antes de usar em resposta oficial ou conteúdo.'
    : impact === 'alto'
      ? 'Revisar a alteração e atualizar conteúdos, calendário, relatórios e referências relacionadas.'
      : 'Registrar alteração e manter acompanhamento normal.';
  const diffPayload = JSON.stringify({
    similarity,
    oldVersionId: oldVersion?.id || null,
    newVersionId: newVersion.id,
    old: oldVersion ? { docType: oldVersion.doc_type, planSection: oldVersion.plan_section, summary: oldVersion.summary } : null,
    new: { docType: newVersion.doc_type, planSection: newVersion.plan_section, summary: newVersion.summary },
  });

  db.run(`INSERT INTO document_change_events (
    file_id, old_version_id, new_version_id, change_type, impact_level, summary, diff_payload,
    affected_modules, recommended_action, status, detected_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'detected', ?)`, [
    fileId,
    oldVersion?.id || null,
    newVersion.id,
    changeType,
    impact,
    summary,
    diffPayload,
    JSON.stringify(affectedModules),
    recommendedAction,
    new Date().toISOString(),
  ]);

  const event = getLatestChangeForFile(fileId);
  if (event && (impact === 'alto' || impact === 'critico')) {
    db.run(`INSERT INTO document_change_alerts (
      change_event_id, alert_title, alert_message, alert_level, target_area, target_page, resolved, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`, [
      event.id,
      impact === 'critico' ? 'Mudança documental crítica detectada' : 'Mudança documental relevante detectada',
      summary,
      impact,
      'essencial',
      'mudancas',
      new Date().toISOString(),
    ]);
  }
  scheduleSave();
  return event;
}

export function getLatestChangeForFile(fileId: number): DocumentChangeEvent | null {
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM document_change_events WHERE file_id = ? ORDER BY id DESC LIMIT 1');
  stmt.bind([fileId]);
  return one(stmt) as DocumentChangeEvent | null;
}

export function listDocumentVersions(fileId: number): DocumentVersion[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM document_versions WHERE file_id = ? ORDER BY version_number DESC');
  stmt.bind([fileId]);
  return rows(stmt) as DocumentVersion[];
}

export function getDocumentVersion(versionId: number): DocumentVersion | null {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM document_versions WHERE id = ?');
  stmt.bind([versionId]);
  return one(stmt) as DocumentVersion | null;
}

export function listDocumentChanges(filters: { impact?: string; status?: string; limit?: number } = {}): DocumentChangeEvent[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const clauses: string[] = [];
  const params: any[] = [];
  if (filters.impact) { clauses.push('impact_level = ?'); params.push(filters.impact); }
  if (filters.status) { clauses.push('status = ?'); params.push(filters.status); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT * FROM document_change_events ${where} ORDER BY detected_at DESC, id DESC LIMIT ?`);
  stmt.bind([...params, Math.min(Math.max(Number(filters.limit || 50), 1), 200)]);
  return rows(stmt) as DocumentChangeEvent[];
}

export function listDocumentChangesByFile(fileId: number): DocumentChangeEvent[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM document_change_events WHERE file_id = ? ORDER BY detected_at DESC, id DESC');
  stmt.bind([fileId]);
  return rows(stmt) as DocumentChangeEvent[];
}

export function getDocumentChange(id: number): DocumentChangeEvent | null {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM document_change_events WHERE id = ?');
  stmt.bind([id]);
  return one(stmt) as DocumentChangeEvent | null;
}

export function updateDocumentChangeStatus(id: number, status: string, reviewedBy = 'user'): void {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return;
  db.run('UPDATE document_change_events SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?', [status, new Date().toISOString(), reviewedBy, id]);
  scheduleSave();
}

export function listDocumentChangeAlerts(resolved?: boolean): any[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const stmt = resolved === undefined
    ? db.prepare('SELECT * FROM document_change_alerts ORDER BY created_at DESC, id DESC LIMIT 200')
    : db.prepare('SELECT * FROM document_change_alerts WHERE resolved = ? ORDER BY created_at DESC, id DESC LIMIT 200');
  if (resolved !== undefined) stmt.bind([resolved ? 1 : 0]);
  return rows(stmt);
}

export function resolveDocumentChangeAlert(id: number): void {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return;
  db.run('UPDATE document_change_alerts SET resolved = 1, resolved_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  scheduleSave();
}

export function getVersionDiff(oldVersionId: number, newVersionId: number): any {
  const oldV = getDocumentVersion(oldVersionId);
  const newV = getDocumentVersion(newVersionId);
  if (!oldV || !newV) return null;
  return {
    oldVersion: oldV,
    newVersion: newV,
    similarity: textSimilarity(oldV.raw_text || '', newV.raw_text || ''),
    summaryChanged: oldV.summary !== newV.summary,
    typeChanged: oldV.doc_type !== newV.doc_type,
    sectionChanged: oldV.plan_section !== newV.plan_section,
    md5Changed: oldV.md5_hash !== newV.md5_hash,
  };
}

export function upsertSourceFileState(input: { fileId: number; sourceId?: number; sourcePath: string; cachePath?: string; md5Hash?: string; lastModified?: string; exists?: boolean }): void {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db || !input.sourcePath) return;
  const existing = db.prepare('SELECT id FROM source_file_state WHERE source_path = ?');
  existing.bind([input.sourcePath]);
  const row = one(existing);
  if (row?.id) {
    db.run(`UPDATE source_file_state SET file_id = ?, source_id = ?, cache_path = ?, md5_hash = ?, last_seen_at = ?, last_modified = ?, exists_on_source = ? WHERE id = ?`, [
      input.fileId, input.sourceId || 0, input.cachePath || '', input.md5Hash || '', new Date().toISOString(), input.lastModified || '', input.exists === false ? 0 : 1, row.id,
    ]);
  } else {
    db.run(`INSERT INTO source_file_state (file_id, source_id, source_path, cache_path, md5_hash, last_seen_at, last_modified, exists_on_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      input.fileId, input.sourceId || 0, input.sourcePath, input.cachePath || '', input.md5Hash || '', new Date().toISOString(), input.lastModified || '', input.exists === false ? 0 : 1,
    ]);
  }
  scheduleSave();
}

export function createCalendarEvent(input: any): any {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;
  db.run(`INSERT INTO calendar_events (event_date, title, description, event_type, source, risk_level, opportunity_level, related_file_ids, related_photo_event_ids, related_change_event_ids, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    input.event_date || input.eventDate,
    input.title,
    input.description || '',
    input.event_type || input.eventType || 'pauta',
    input.source || 'manual',
    input.risk_level || input.riskLevel || 'baixo',
    input.opportunity_level || input.opportunityLevel || 'medio',
    JSON.stringify(input.related_file_ids || input.relatedFileIds || []),
    JSON.stringify(input.related_photo_event_ids || input.relatedPhotoEventIds || []),
    JSON.stringify(input.related_change_event_ids || input.relatedChangeEventIds || []),
    input.status || 'suggested',
    new Date().toISOString(),
    new Date().toISOString(),
  ]);
  scheduleSave();
  const stmt = db.prepare('SELECT * FROM calendar_events ORDER BY id DESC LIMIT 1');
  return one(stmt);
}

export function listCalendarEvents(params: { date?: string; from?: string; to?: string; limit?: number } = {}): any[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const clauses: string[] = [];
  const values: any[] = [];
  if (params.date) { clauses.push('event_date = ?'); values.push(params.date); }
  if (params.from) { clauses.push('event_date >= ?'); values.push(params.from); }
  if (params.to) { clauses.push('event_date <= ?'); values.push(params.to); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT * FROM calendar_events ${where} ORDER BY event_date DESC, id DESC LIMIT ?`);
  stmt.bind([...values, Math.min(Math.max(Number(params.limit || 100), 1), 300)]);
  return rows(stmt);
}

export function listCalendarOpportunities(params: { date?: string; status?: string; limit?: number } = {}): any[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const clauses: string[] = [];
  const values: any[] = [];
  if (params.date) { clauses.push('opportunity_date = ?'); values.push(params.date); }
  if (params.status) { clauses.push('status = ?'); values.push(params.status); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT * FROM calendar_content_opportunities ${where} ORDER BY opportunity_date DESC, priority DESC LIMIT ?`);
  stmt.bind([...values, Math.min(Math.max(Number(params.limit || 100), 1), 300)]);
  return rows(stmt);
}

export function createCalendarOpportunity(input: any): any {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;
  db.run(`INSERT INTO calendar_content_opportunities (opportunity_date, title, summary, suggested_format, priority, status, source_payload, related_change_event_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    input.opportunity_date || input.opportunityDate,
    input.title,
    input.summary || '',
    input.suggested_format || input.suggestedFormat || 'post_instagram',
    Number(input.priority || 0),
    input.status || 'suggested',
    JSON.stringify(input.source_payload || input.sourcePayload || {}),
    input.related_change_event_id || input.relatedChangeEventId || null,
    new Date().toISOString(),
  ]);
  scheduleSave();
  const stmt = db.prepare('SELECT * FROM calendar_content_opportunities ORDER BY id DESC LIMIT 1');
  return one(stmt);
}

export function addPhotoTag(photoId: number, tag: string, source = 'manual', confidence = 1): any {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;
  db.run('INSERT INTO photo_tags (photo_id, tag, source, confidence, created_at) VALUES (?, ?, ?, ?, ?)', [photoId, tag, source, confidence, new Date().toISOString()]);
  scheduleSave();
  const stmt = db.prepare('SELECT * FROM photo_tags WHERE photo_id = ? ORDER BY id DESC LIMIT 1');
  stmt.bind([photoId]);
  return one(stmt);
}

export function listPhotoTags(photoId?: number): any[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const stmt = photoId ? db.prepare('SELECT * FROM photo_tags WHERE photo_id = ? ORDER BY tag') : db.prepare('SELECT tag, COUNT(*) as count FROM photo_tags GROUP BY tag ORDER BY count DESC, tag');
  if (photoId) stmt.bind([photoId]);
  return rows(stmt);
}

export function deletePhotoTag(photoId: number, tag: string): void {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM photo_tags WHERE photo_id = ? AND tag = ?', [photoId, tag]);
  scheduleSave();
}

export function recordPhotoUsage(input: any): any {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;
  db.run(`INSERT INTO photo_usage (photo_id, event_id, usage_type, usage_title, usage_url, used_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
    input.photo_id || input.photoId || null,
    input.event_id || input.eventId || null,
    input.usage_type || input.usageType || 'site',
    input.usage_title || input.usageTitle || '',
    input.usage_url || input.usageUrl || '',
    input.used_at || input.usedAt || new Date().toISOString(),
    input.notes || '',
  ]);
  scheduleSave();
  const stmt = db.prepare('SELECT * FROM photo_usage ORDER BY id DESC LIMIT 1');
  return one(stmt);
}

export function listPhotoUsage(params: { photoId?: number; eventId?: number } = {}): any[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const clauses: string[] = [];
  const values: any[] = [];
  if (params.photoId) { clauses.push('photo_id = ?'); values.push(params.photoId); }
  if (params.eventId) { clauses.push('event_id = ?'); values.push(params.eventId); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT * FROM photo_usage ${where} ORDER BY used_at DESC, id DESC LIMIT 300`);
  stmt.bind(values);
  return rows(stmt);
}

export function listUnusedPhotos(limit = 200): any[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT p.*, pe.event_name, pe.event_date
    FROM photos p
    JOIN photo_events pe ON pe.id = p.event_id
    LEFT JOIN photo_usage pu ON pu.photo_id = p.id
    WHERE pu.id IS NULL
    ORDER BY p.indexed_at DESC
    LIMIT ?
  `);
  stmt.bind([Math.min(Math.max(Number(limit || 200), 1), 500)]);
  return rows(stmt);
}

export function createPhotoHighlight(input: any): any {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return null;
  db.run('INSERT INTO photo_highlights (photo_id, event_id, highlight_type, score, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    input.photo_id || input.photoId,
    input.event_id || input.eventId || null,
    input.highlight_type || input.highlightType || 'site',
    Number(input.score || 0),
    input.reason || '',
    new Date().toISOString(),
  ]);
  scheduleSave();
  const stmt = db.prepare('SELECT * FROM photo_highlights ORDER BY id DESC LIMIT 1');
  return one(stmt);
}

export function listPhotoHighlights(params: { eventId?: number; type?: string } = {}): any[] {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return [];
  const clauses: string[] = [];
  const values: any[] = [];
  if (params.eventId) { clauses.push('event_id = ?'); values.push(params.eventId); }
  if (params.type) { clauses.push('highlight_type = ?'); values.push(params.type); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT * FROM photo_highlights ${where} ORDER BY score DESC, created_at DESC LIMIT 300`);
  stmt.bind(values);
  return rows(stmt);
}

export function getDayIntelligence(date: string): any {
  ensureIntelligenceTables();
  const db = getDatabase();
  if (!db) return { date, documents: [], photoEvents: [], changes: [], events: [], opportunities: [] };
  const docsStmt = db.prepare('SELECT * FROM files WHERE substr(last_modified, 1, 10) = ? ORDER BY last_modified DESC LIMIT 200');
  docsStmt.bind([date]);
  const photoStmt = db.prepare('SELECT * FROM photo_events WHERE event_date = ? ORDER BY event_name LIMIT 200');
  photoStmt.bind([date]);
  const changesStmt = db.prepare('SELECT * FROM document_change_events WHERE substr(detected_at, 1, 10) = ? ORDER BY detected_at DESC LIMIT 200');
  changesStmt.bind([date]);
  return {
    date,
    documents: rows(docsStmt),
    photoEvents: rows(photoStmt),
    changes: rows(changesStmt),
    events: listCalendarEvents({ date }),
    opportunities: listCalendarOpportunities({ date }),
  };
}
