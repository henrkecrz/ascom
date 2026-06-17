import { initDatabase, saveDatabase } from './database';
import { runAnalysis } from './analysis/analyzer';

async function main(): Promise<void> {
  console.log('=== ANALISADOR DE DOCUMENTOS ===\n');

  await initDatabase();

  console.log('Iniciando extração de texto e análise NLP...');
  await runAnalysis();

  saveDatabase();

  const db = require('./database').getDatabase();
  const textStmt = db.prepare("SELECT COUNT(*) as count FROM document_text WHERE status = 'done'");
  textStmt.step();
  const extracted = Number(textStmt.getAsObject().count);
  textStmt.free();

  const relStmt = db.prepare('SELECT COUNT(*) as count FROM document_relations');
  relStmt.step();
  const relations = Number(relStmt.getAsObject().count);
  relStmt.free();

  const clusterStmt = db.prepare('SELECT COUNT(*) as count FROM document_clusters');
  clusterStmt.step();
  const clusters = Number(clusterStmt.getAsObject().count);
  clusterStmt.free();

  console.log('\n=== RESUMO ===');
  console.log(`Documentos com texto extraído: ${extracted}`);
  console.log(`Relações de similaridade: ${relations}`);
  console.log(`Clusters temáticos: ${clusters}`);
  console.log('Análise completa!');
}

main().catch(console.error);
