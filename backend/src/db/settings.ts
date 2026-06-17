import { getDatabase, scheduleSave, saveDatabase } from './connection';

export function getSetting(key: string): string {
  const db = getDatabase();
  if (!db) return '';
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  stmt.bind([key]);
  let val = '';
  if (stmt.step()) {
    val = String(stmt.getAsObject().value || '');
  }
  stmt.free();
  return val;
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  if (!db) return;
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  saveDatabase();
}

export function setSettingNoSave(key: string, value: string): void {
  const db = getDatabase();
  if (!db) return;
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  scheduleSave();
}
