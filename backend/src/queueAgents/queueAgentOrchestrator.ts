import type { QueueItem } from '../queue';
import { logger } from '../lib/logger';
import { getQueueAgent } from './queueAgentRegistry';
import { insertQueueAgentLog } from './logs';
import { QueueAgentContext, QueueAgentStage, QueueAgentExecutor, QueueAgentJob, QueueAgentResult } from './types';

function toQueueAgentStage(stage: string): QueueAgentStage | null {
  const valid = ['extract', 'analyze', 'structure', 'relations', 'clusters', 'knowledge', 'risk', 'simulator', 'site_sync'];
  return valid.includes(stage) ? stage as QueueAgentStage : null;
}

function buildJob(item: QueueItem, context: QueueAgentContext): QueueAgentJob {
  return {
    id: item.id,
    fileId: item.file_id,
    stage: item.stage as QueueAgentStage,
    fileName: context.file?.name || (item.file_id === 0 ? `[Global] ${item.stage}` : `#${item.file_id}`),
    payload: {
      retryCount: item.retry_count,
      priority: item.priority,
    },
  };
}

export async function executeQueueAgentStage(
  item: QueueItem,
  context: QueueAgentContext,
  executor: QueueAgentExecutor
): Promise<QueueAgentResult[]> {
  const stage = toQueueAgentStage(item.stage);
  if (!stage) {
    await executor();
    return [];
  }

  const handler = getQueueAgent(stage);
  if (!handler) {
    await executor();
    return [];
  }

  const job = buildJob(item, context);

  try {
    const results = await handler(job, context, executor);
    for (const result of results) {
      insertQueueAgentLog(item.id, item.file_id, result);
    }
    return results;
  } catch (err: any) {
    const errorResult: QueueAgentResult = {
      agent: `${stage}QueueAgent`,
      stage,
      status: 'error',
      confidence: 0,
      summary: `Erro no agente de fila do estágio ${stage}: ${err.message || 'erro desconhecido'}`,
      recommendedAction: 'Verificar logs do worker e reprocessar o item se necessário.',
      metadata: { error: err.message || String(err) },
    };
    insertQueueAgentLog(item.id, item.file_id, errorResult);
    logger.error('Erro no orquestrador de agentes de fila', { stage, error: err.message });
    throw err;
  }
}
