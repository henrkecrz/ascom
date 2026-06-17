import { getDatabase, scheduleSave, saveDatabase } from './connection';

export function insertKnowledgeRelation(rel: {
  source_type: string;
  source_id: number;
  target_type: string;
  target_id: number;
  relation_type: string;
  confidence?: number;
  metadata?: any;
}): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`INSERT INTO knowledge_relations (source_type, source_id, target_type, target_id, relation_type, confidence, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [rel.source_type, rel.source_id, rel.target_type, rel.target_id, rel.relation_type,
     rel.confidence || 1.0, rel.metadata ? JSON.stringify(rel.metadata) : null]);
  scheduleSave();
}

export function queryKnowledgeRelations(filters: {
  source_type?: string;
  source_id?: number;
  target_type?: string;
  target_id?: number;
  relation_type?: string;
}): any[] {
  const db = getDatabase();
  if (!db) return [];
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.source_type) { conditions.push('source_type = ?'); params.push(filters.source_type); }
  if (filters.source_id !== undefined) { conditions.push('source_id = ?'); params.push(filters.source_id); }
  if (filters.target_type) { conditions.push('target_type = ?'); params.push(filters.target_type); }
  if (filters.target_id !== undefined) { conditions.push('target_id = ?'); params.push(filters.target_id); }
  if (filters.relation_type) { conditions.push('relation_type = ?'); params.push(filters.relation_type); }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const stmt = db.prepare(`SELECT * FROM knowledge_relations ${where} ORDER BY confidence DESC LIMIT 100`);
  if (params.length > 0) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      source_type: String(row.source_type),
      source_id: Number(row.source_id),
      target_type: String(row.target_type),
      target_id: Number(row.target_id),
      relation_type: String(row.relation_type),
      confidence: Number(row.confidence),
      metadata: (() => { try { return row.metadata ? JSON.parse(String(row.metadata)) : null; } catch { return null; } })(),
    });
  }
  stmt.free();
  return results;
}

export function clearKnowledgeRelations(): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM knowledge_relations');
  saveDatabase();
}

export function insertClassificationFeedback(fb: {
  file_id: number;
  original_type: string;
  corrected_type: string;
  corrected_by?: string;
}): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`INSERT INTO classification_feedback (file_id, original_type, corrected_type, corrected_by, created_at)
    VALUES (?, ?, ?, ?, ?)`,
    [fb.file_id, fb.original_type, fb.corrected_type, fb.corrected_by || 'user', new Date().toISOString()]);
  saveDatabase();
}

export function getClassificationFeedback(limit: number = 50): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM classification_feedback ORDER BY created_at DESC LIMIT ?');
  stmt.bind([limit]);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      file_id: Number(row.file_id),
      original_type: String(row.original_type),
      corrected_type: String(row.corrected_type),
      corrected_by: String(row.corrected_by || 'user'),
      created_at: String(row.created_at || ''),
    });
  }
  stmt.free();
  return results;
}
