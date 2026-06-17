import { getDatabase } from '../database';
import { QueueAgentHandler } from './types';

function countClusters(): number {
  const db = getDatabase();
  if (!db) return 0;
  try {
    const stmt = db.prepare('SELECT COUNT(DISTINCT cluster_id) as c FROM document_clusters');
    stmt.step();
    const count = Number((stmt.getAsObject() as any).c || 0);
    stmt.free();
    return count;
  } catch {
    return 0;
  }
}

export const clusterQueueAgent: QueueAgentHandler = async (_job, _context, executor) => {
  await executor();
  const total = countClusters();

  return [{
    agent: 'clusterQueueAgent',
    stage: 'clusters',
    status: 'done',
    confidence: total > 0 ? 0.74 : 0.42,
    summary: `Clusters temáticos processados. Total atual de grupos: ${total}.`,
    recommendedAction: total > 0 ? 'Usar clusters para navegação por temas recorrentes.' : 'Processar mais documentos para formar grupos temáticos.',
    metadata: { clusterCount: total },
  }];
};
