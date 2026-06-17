import { getDatabase, scheduleSave, saveDatabase } from './connection';

export function updateDocumentText(fileId: number, rawText: string, status: string = 'done'): void {
  const db = getDatabase();
  if (!db) return;
  const now = new Date().toISOString();
  db.run(`DELETE FROM document_text WHERE file_id = ?`, [fileId]);
  db.run(`INSERT INTO document_text (file_id, raw_text, extracted_at, status) VALUES (?, ?, ?, ?)`,
    [fileId, rawText, now, status]);
}

export function updateDocumentSummary(fileId: number, summary: string, keywords: string, topics: string, wordCount: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`DELETE FROM document_summary WHERE file_id = ?`, [fileId]);
  db.run(`INSERT INTO document_summary (file_id, summary, keywords, topics, word_count) VALUES (?, ?, ?, ?, ?)`,
    [fileId, summary, keywords, topics, wordCount]);
}

export function insertRelation(fileId1: number, fileId2: number, score: number, sharedKeywords: string): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`DELETE FROM document_relations WHERE file_id_1 = ? AND file_id_2 = ?`, [fileId1, fileId2]);
  db.run(`DELETE FROM document_relations WHERE file_id_1 = ? AND file_id_2 = ?`, [fileId2, fileId1]);
  db.run(`INSERT INTO document_relations (file_id_1, file_id_2, similarity_score, shared_keywords) VALUES (?, ?, ?, ?)`,
    [fileId1, fileId2, score, sharedKeywords]);
}

export function insertCluster(name: string, description: string, fileIds: string, themeWords: string): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`INSERT INTO document_clusters (name, description, file_ids, theme_words) VALUES (?, ?, ?, ?)`,
    [name, description, fileIds, themeWords]);
}

export function clearClusters(): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM document_relations');
  db.run('DELETE FROM document_clusters');
  db.run('DELETE FROM document_summary');
}

export function updateFileClassification(id: number, docType: string, confidence: number, planSection: string): void {
  const db = getDatabase();
  if (!db) return;
  db.run('UPDATE files SET doc_type = ?, doc_type_confidence = ?, plan_section = ? WHERE id = ?',
    [docType, confidence, planSection, id]);
}

export function updateFileEntities(id: number, entities: string): void {
  const db = getDatabase();
  if (!db) return;
  db.run('UPDATE files SET entities = ? WHERE id = ?', [entities, id]);
}

export function updateFileTalkingPoints(id: number, talkingPoints: string): void {
  const db = getDatabase();
  if (!db) return;
  db.run('UPDATE files SET talking_points = ? WHERE id = ?', [talkingPoints, id]);
  saveDatabase();
}

export function getDocumentsByType(docType: string): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.doc_type, f.doc_type_confidence, f.plan_section, f.entities, f.needs_review,
           ds.summary, ds.keywords, ds.word_count
    FROM files f
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    WHERE f.doc_type = ?
    ORDER BY f.doc_type_confidence DESC
  `);
  stmt.bind([docType]);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      name: String(row.name),
      extension: row.extension,
      docType: String(row.doc_type),
      confidence: Number(row.doc_type_confidence),
      planSection: String(row.plan_section),
      entities: row.entities,
      needsReview: Number(row.needs_review) === 1,
      summary: String(row.summary || ''),
      keywords: String(row.keywords || ''),
      wordCount: Number(row.word_count || 0),
    });
  }
  stmt.free();
  return results;
}

export function getDocumentsNeedingReview(): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.doc_type, f.doc_type_confidence, f.plan_section, f.last_modified
    FROM files f
    WHERE f.needs_review = 1
    ORDER BY f.last_modified ASC
  `);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      name: String(row.name),
      extension: row.extension,
      docType: String(row.doc_type),
      confidence: Number(row.doc_type_confidence),
      planSection: String(row.plan_section),
      lastModified: String(row.last_modified || ''),
    });
  }
  stmt.free();
  return results;
}

export function getStatsByType(): { docType: string; count: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT doc_type, COUNT(*) as count FROM files GROUP BY doc_type ORDER BY count DESC');
  const results: { docType: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({ docType: String(row.doc_type), count: Number(row.count) });
  }
  stmt.free();
  return results;
}

export function reclassifyFile(id: number, docType: string, planSection: string): void {
  const db = getDatabase();
  if (!db) return;
  db.run('UPDATE files SET doc_type = ?, doc_type_confidence = 1, plan_section = ?, needs_review = 0 WHERE id = ?',
    [docType, planSection, id]);
}
