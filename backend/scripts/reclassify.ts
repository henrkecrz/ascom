import { initDatabase, getDatabase, flushDatabase } from '../src/database';
import { reclassifyAllScenarios } from '../src/db/simulator';

async function main() {
  await initDatabase();
  const db = getDatabase();
  if (!db) {
    console.error('No database connection');
    return;
  }
  console.log('Reclassificando cenários...');
  const result = reclassifyAllScenarios();
  console.log('Resultado:', result);
  flushDatabase();
}

main().catch(console.error);
