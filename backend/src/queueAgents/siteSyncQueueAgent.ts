import { getLastSiteAgentsRun } from '../siteAgents/siteAgentOrchestrator';
import { QueueAgentHandler } from './types';

export const siteSyncQueueAgent: QueueAgentHandler = async (_job, _context, executor) => {
  await executor();
  const lastRun = getLastSiteAgentsRun();

  return [{
    agent: 'siteSyncQueueAgent',
    stage: 'site_sync',
    status: lastRun?.errors?.length ? 'error' : 'done',
    confidence: lastRun ? 0.86 : 0.45,
    summary: lastRun
      ? `Site Agents executados: ${lastRun.agentsRun.length}. Snapshots salvos: ${lastRun.snapshotsSaved}. Erros: ${lastRun.errors.length}.`
      : 'Sincronização dos Site Agents executada sem resultado disponível.',
    recommendedAction: lastRun?.errors?.length
      ? 'Verificar erros dos Site Agents e reexecutar sincronização manualmente.'
      : 'Usar snapshots atualizados nas áreas do painel.',
    metadata: {
      lastRun,
    },
  }];
};
