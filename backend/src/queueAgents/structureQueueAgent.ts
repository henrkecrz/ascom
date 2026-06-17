import { QueueAgentHandler } from './types';

export const structureQueueAgent: QueueAgentHandler = async (job, context, executor) => {
  await executor();
  const ext = context.file?.extension || 'sem extensão';

  return [{
    agent: 'structureQueueAgent',
    stage: 'structure',
    status: 'done',
    confidence: 0.76,
    summary: `Estruturação processada para ${job.fileName || `arquivo #${job.fileId}`} (${ext}).`,
    recommendedAction: 'Validar dados estruturados importados quando houver planilhas, tabelas ou DOCX com seções.',
    metadata: {
      fileId: job.fileId,
      extension: ext,
    },
  }];
};
