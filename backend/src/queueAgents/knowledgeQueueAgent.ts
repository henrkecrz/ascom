import { getDatabase } from '../database';
import { QueueAgentHandler } from './types';

function countKnowledgeRelations(): number {
  const db = getDatabase();
  if (!db) return 0;
  try {
    const stmt = db.prepare('SELECT COUNT(*) as c FROM knowledge_relations');
    stmt.step();
    const count = Number((stmt.getAsObject() as any).c || 0);
    stmt.free();
    return count;
  } catch {
    return 0;
  }
}

export const knowledgeQueueAgent: QueueAgentHandler = async (_job, _context, executor) => {
  await executor();
  const total = countKnowledgeRelations();

  return [{
    agent: 'knowledgeQueueAgent',
    stage: 'knowledge',
    status: 'done',
    confidence: total > 0 ? 0.8 : 0.45,
    summary: `Grafo de conhecimento atualizado. Relações de conhecimento registradas: ${total}.`,
    recommendedAction: total > 0 ? 'Usar o grafo para navegar conexões entre documentos, seções, contatos e dados.' : 'Verificar se há documentos analisados e seções extraídas suficientes.',
    metadata: { knowledgeRelationCount: total },
  }];
};
