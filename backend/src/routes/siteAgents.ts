import { Router, Request, Response } from 'express';
import { listSiteAgents } from '../siteAgents/siteAgentRegistry';
import { getLastSiteAgentsRun, runSiteAgentsSync } from '../siteAgents/siteAgentOrchestrator';
import { listSiteSnapshots } from '../siteAgents/snapshots';
import { isSiteSyncWorkerRunning, runSafeSiteSync } from '../siteAgents/siteSyncWorker';
import { SiteArea } from '../siteAgents/types';
import { logger } from '../lib/logger';

const router = Router();

router.get('/api/site-agents', (_req: Request, res: Response) => {
  res.json({
    agents: listSiteAgents(),
    workerRunning: isSiteSyncWorkerRunning(),
    lastRun: getLastSiteAgentsRun(),
  });
});

router.get('/api/site-agents/snapshots', (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json({
    snapshots: listSiteSnapshots({
      area: req.query.area as SiteArea | undefined,
      page: req.query.page ? String(req.query.page) : undefined,
      agent: req.query.agent ? String(req.query.agent) : undefined,
      riskLevel: req.query.riskLevel ? String(req.query.riskLevel) : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    }),
  });
});

router.get('/api/site-agents/snapshots/:area', (req: Request, res: Response) => {
  res.json({
    area: req.params.area,
    snapshots: listSiteSnapshots({ area: req.params.area as SiteArea }),
  });
});

router.get('/api/site-agents/snapshots/:area/:page', (req: Request, res: Response) => {
  res.json({
    area: req.params.area,
    page: req.params.page,
    snapshots: listSiteSnapshots({ area: req.params.area as SiteArea, page: String(req.params.page) }),
  });
});

router.post('/api/site-agents/run', async (req: Request, res: Response) => {
  try {
    const agents = Array.isArray(req.body?.agents) ? req.body.agents.map(String) : undefined;
    const result = agents?.length
      ? await runSiteAgentsSync({ reason: 'manual', requestedAgents: agents })
      : await runSafeSiteSync('manual');
    res.json({ success: true, result });
  } catch (err: any) {
    logger.error('Erro ao executar Site Agents manualmente', { error: err.message });
    res.status(500).json({ error: err.message || 'Erro ao executar Site Agents' });
  }
});

export default router;
