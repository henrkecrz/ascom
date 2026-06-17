import { getDatabase } from '../database';
import { QueueAgentHandler } from './types';

function countRelations(): number {
  const db = getDatabase();
  if (!db) return 0;
  try {
    const stmt = db.prepare('SELECT COUNT(*) as c FROM document_relations');
    stmt.step();
    const count = Number((stmt.getAsObject() as any).c || 0);
    stmt.free();
    return count;
  } catch {
    return 0;
  }
}

export const relationQueueAgent: QueueAgentHandler = async (_job, _context, executor) => {
  await executor();
  const total = countRelations();

  return [{
    agent: 'relationQueueAgent',
    stage: 'relations',
    status: 'done',
    confidence: total > 0 ? 0.78 : 0.45,
    summary: `Relações documentais processadas. Total atual de relações: ${total}.`,
    recommendedAction: total > 0 ? 'Usar relações para busca contextual e documentos relacionados.' : 'Aguardar mais documentos com texto para gerar relações.',
    metadata: { relationCount: total },
  }];
};
