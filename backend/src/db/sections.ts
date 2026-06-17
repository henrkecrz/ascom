import { getDatabase, scheduleSave } from './connection';

export function insertDocumentSection(section: {
  file_id: number;
  section_title: string;
  section_level: number;
  content: string;
  has_table?: boolean;
  table_data?: any;
  extracted_entities?: any;
}): number {
  const db = getDatabase();
  if (!db) return 0;
  db.run(`INSERT INTO document_sections (file_id, section_title, section_level, content, has_table, table_data, extracted_entities)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [section.file_id, section.section_title, section.section_level, section.content,
     section.has_table ? 1 : 0,
     section.table_data ? JSON.stringify(section.table_data) : null,
     section.extracted_entities ? JSON.stringify(section.extracted_entities) : null]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  scheduleSave();
  if (result.length > 0 && result[0].values.length > 0) return Number(result[0].values[0][0]);
  return 0;
}

export function insertDocumentSectionSync(section: {
  file_id: number;
  section_title: string;
  section_level: number;
  content: string;
  has_table?: boolean;
  table_data?: any;
  extracted_entities?: any;
}): number {
  const id = insertDocumentSection(section);
  if (id > 0) scheduleSave();
  return id;
}

export function getDocumentSections(fileId: number): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM document_sections WHERE file_id = ? ORDER BY section_level, id');
  stmt.bind([fileId]);
  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      file_id: Number(row.file_id),
      section_title: String(row.section_title || ''),
      section_level: Number(row.section_level),
      content: String(row.content || ''),
      has_table: Number(row.has_table) === 1,
      table_data: (() => { try { return row.table_data ? JSON.parse(String(row.table_data)) : null; } catch { return null; } })(),
      extracted_entities: (() => { try { return row.extracted_entities ? JSON.parse(String(row.extracted_entities)) : null; } catch { return null; } })(),
    });
  }
  stmt.free();
  return results;
}
