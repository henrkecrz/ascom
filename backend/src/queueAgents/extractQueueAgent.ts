import { QueueAgentHandler } from './types';

export const extractQueueAgent: QueueAgentHandler = async (job, context, executor) => {
  await executor();
  const extension = context.file?.extension || 'sem extensão';

  return [{
    agent: 'extractQueueAgent',
    stage: 'extract',
    status: 'done',
    confidence: 0.9,
    summary: `Extração processada para ${job.fileName || `arquivo #${job.fileId}`} (${extension}).`,
    recommendedAction: 'Prosseguir para análise documental.',
    metadata: {
      fileId: job.fileId,
      extension,
    },
  }];
};
