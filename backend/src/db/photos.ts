import { getDatabase, scheduleSave, saveDatabase } from './connection';

export function insertPhotoEvent(event: {
  event_date: string; event_name: string; source_path: string;
  month_folder: string; thumbnail_path?: string; photo_count?: number
}): number {
  const db = getDatabase();
  if (!db) return 0;
  db.run(`INSERT OR IGNORE INTO photo_events (event_date, event_name, source_path, month_folder, thumbnail_path, photo_count, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [event.event_date, event.event_name, event.source_path, event.month_folder,
     event.thumbnail_path || '', event.photo_count || 0, new Date().toISOString()]);
  scheduleSave();
  const stmt = db.prepare('SELECT id FROM photo_events WHERE source_path = ?');
  stmt.bind([event.source_path]);
  let id = 0;
  if (stmt.step()) id = Number(stmt.getAsObject().id);
  stmt.free();
  return id;
}

export function updatePhotoEvent(id: number, data: { thumbnail_path?: string; photo_count?: number }): void {
  const db = getDatabase();
  if (!db) return;
  if (data.thumbnail_path) db.run('UPDATE photo_events SET thumbnail_path = ? WHERE id = ?', [data.thumbnail_path, id]);
  if (data.photo_count !== undefined) db.run('UPDATE photo_events SET photo_count = ? WHERE id = ?', [data.photo_count, id]);
  scheduleSave();
}

export function insertPhoto(photo: {
  event_id: number; filename: string; source_path: string;
  thumbnail_path?: string; file_size?: number; width?: number; height?: number
}): number {
  const db = getDatabase();
  if (!db) return 0;
  db.run(`INSERT OR IGNORE INTO photos (event_id, filename, source_path, thumbnail_path, file_size, width, height, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [photo.event_id, photo.filename, photo.source_path, photo.thumbnail_path || '',
     photo.file_size || 0, photo.width || 0, photo.height || 0, new Date().toISOString()]);
  scheduleSave();
  const stmt = db.prepare('SELECT id FROM photos WHERE source_path = ?');
  stmt.bind([photo.source_path]);
  let id = 0;
  if (stmt.step()) id = Number(stmt.getAsObject().id);
  stmt.free();
  return id;
}

export function getAllPhotoEvents(): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM photo_events ORDER BY event_date DESC');
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      event_date: String(row.event_date || ''),
      event_name: String(row.event_name),
      source_path: String(row.source_path),
      month_folder: String(row.month_folder || ''),
      thumbnail_path: String(row.thumbnail_path || ''),
      photo_count: Number(row.photo_count),
      indexed_at: String(row.indexed_at || ''),
    });
  }
  stmt.free();
  return results;
}

export function getPhotoEventById(id: number): any {
  const db = getDatabase();
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM photo_events WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject() as any;
  stmt.free();
  return {
    id: Number(row.id),
    event_date: String(row.event_date || ''),
    event_name: String(row.event_name),
    source_path: String(row.source_path),
    month_folder: String(row.month_folder || ''),
    thumbnail_path: String(row.thumbnail_path || ''),
    photo_count: Number(row.photo_count),
    indexed_at: String(row.indexed_at || ''),
  };
}

export function getPhotosByEvent(eventId: number): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM photos WHERE event_id = ? ORDER BY filename');
  stmt.bind([eventId]);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      event_id: Number(row.event_id),
      filename: String(row.filename),
      source_path: String(row.source_path),
      thumbnail_path: String(row.thumbnail_path || ''),
      file_size: Number(row.file_size),
      width: Number(row.width),
      height: Number(row.height),
      indexed_at: String(row.indexed_at || ''),
    });
  }
  stmt.free();
  return results;
}

export function insertPhotoDocumentLink(eventId: number, docId: number, confidence: number = 0): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`INSERT OR IGNORE INTO photo_document_links (photo_event_id, document_id, match_type, confidence)
    VALUES (?, ?, 'auto', ?)`, [eventId, docId, confidence]);
  scheduleSave();
}

export function getDocumentsForPhotoEvent(eventId: number): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.category, f.plan_section, f.doc_type,
           pdl.confidence, pdl.match_type
    FROM photo_document_links pdl
    JOIN files f ON f.id = pdl.document_id
    WHERE pdl.photo_event_id = ?
    ORDER BY pdl.confidence DESC
  `);
  stmt.bind([eventId]);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      name: String(row.name),
      extension: row.extension,
      category: String(row.category || ''),
      plan_section: String(row.plan_section || ''),
      doc_type: String(row.doc_type || ''),
      confidence: Number(row.confidence),
      match_type: String(row.match_type),
    });
  }
  stmt.free();
  return results;
}

export function getPhotosForDocument(docId: number): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`
    SELECT p.*, pe.event_name, pe.event_date
    FROM photo_document_links pdl
    JOIN photos p ON p.event_id = pdl.photo_event_id
    JOIN photo_events pe ON pe.id = pdl.photo_event_id
    WHERE pdl.document_id = ?
    ORDER BY pe.event_date DESC
  `);
  stmt.bind([docId]);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      event_id: Number(row.event_id),
      filename: String(row.filename),
      source_path: String(row.source_path),
      thumbnail_path: String(row.thumbnail_path || ''),
      event_name: String(row.event_name),
      event_date: String(row.event_date || ''),
    });
  }
  stmt.free();
  return results;
}

export function clearPhotoIndex(): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM photo_document_links');
  db.run('DELETE FROM photos');
  db.run('DELETE FROM photo_events');
  saveDatabase();
}
