import { initDatabase, getDatabase } from './database';

async function main() {
  await initDatabase();
  const db = getDatabase();
  if (!db) { console.log('No DB'); return; }
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tables:', JSON.stringify(tables));
  const tablesToCheck = ['structured_data', 'document_sections', 'knowledge_relations', 'classification_feedback'];
  for (const table of tablesToCheck) {
    try {
      const stmt = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`);
      stmt.step();
      const r = stmt.getAsObject();
      stmt.free();
      console.log(`${table}:`, JSON.stringify(r));
    } catch (e: any) {
      console.log(`${table}: ERROR -`, e.message);
    }
  }
}
main();
