import { getDatabase, saveDatabase } from './connection';

export function getAllContacts(): any[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM contacts ORDER BY organization, name');
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function insertContact(contact: { name: string; role: string; organization: string; phone: string; email: string; notes: string }): number {
  const db = getDatabase();
  if (!db) return 0;
  db.run('INSERT INTO contacts (name, role, organization, phone, email, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [contact.name, contact.role, contact.organization, contact.phone, contact.email, contact.notes]);
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  if (result.length > 0 && result[0].values.length > 0) {
    return Number(result[0].values[0][0]);
  }
  return 0;
}

export function deleteContact(id: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM contacts WHERE id = ?', [id]);
  saveDatabase();
}
