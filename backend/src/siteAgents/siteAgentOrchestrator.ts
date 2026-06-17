import { logger } from '../lib/logger';
import { getSiteAgents } from './siteAgentRegistry';
import { ensureSiteSnapshotsTable, saveSiteSnapshots } from './snapshots';
import { SiteAgentsRunResult, SiteAgentRunContext } from './types';

let lastRun: SiteAgentsRunResult | null = null;

export async function runSiteAgentsSync(context: SiteAgentRunContext = {}): Promise<SiteAgentsRunResult> {
  ensureSiteSnapshotsTable();

  const startedAt = new Date().toISOString();
  const reason = context.reason || 'manual';
  const agents = getSiteAgents(context.requestedAgents);
  const agentsRun: string[] = [];
  const errors: { agent: string; message: string }[] = [];
  let snapshotsSaved = 0;

  for (const agent of agents) {
    try {
      const snapshots = await agent.handler({ ...context, reason, now: context.now || new Date() });
      const saved = saveSiteSnapshots(snapshots);
      snapshotsSaved += saved.length;
      agentsRun.push(agent.id);
      logger.info('Site agent executado', { agent: agent.id, snapshots: saved.length });
    } catch (err: any) {
      errors.push({ agent: agent.id, message: err.message || String(err) });
      logger.warn('Falha ao executar site agent', { agent: agent.id, error: err.message });
    }
  }

  const result: SiteAgentsRunResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    reason,
    agentsRun,
    snapshotsSaved,
    errors,
  };

  lastRun = result;
  return result;
}

export function getLastSiteAgentsRun(): SiteAgentsRunResult | null {
  return lastRun;
}
