import { Router, Request, Response } from 'express';
import { enqueueAllFiles, enqueueGlobalStages, getQueueStats, getQueueProgress, clearQueue } from '../queue';
import { startWorker, pauseWorker, resumeWorker, isPaused, getProcessedCount, getCurrentProcessing } from '../queueWorker';
import { listQueueAgents } from '../queueAgents/queueAgentRegistry';
import { listQueueAgentLogs } from '../queueAgents/logs';
import { logger } from '../lib/logger';

const router = Router();

router.get('/api/queue/status', (_req: Request, res: Response) => {
  const stats = getQueueStats();
  const progress = getQueueProgress();
  res.json({
    ...stats,
    progress,
    workerRunning: !isPaused(),
    workerPaused: isPaused(),
    processedCount: getProcessedCount(),
  });
});

router.get('/api/queue/agents', (_req: Request, res: Response) => {
  res.json({ agents: listQueueAgents() });
});

router.get('/api/queue/agent-logs', (req: Request, res: Response) => {
  const fileId = req.query.fileId ? Number(req.query.fileId) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const logs = listQueueAgentLogs({
    fileId: Number.isFinite(fileId) ? fileId : undefined,
    stage: req.query.stage as any,
    agent: req.query.agent ? String(req.query.agent) : undefined,
    riskLevel: req.query.riskLevel ? String(req.query.riskLevel) : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  res.json({ logs });
});

router.post('/api/queue/start', (_req: Request, res: Response) => {
  const total = enqueueAllFiles();
  enqueueGlobalStages();
  resumeWorker();
  logger.info('Fila iniciada', { total: total.total });
  res.json({ success: true, enqueued: total.total });
});

router.post('/api/queue/pause', (_req: Request, res: Response) => {
  pauseWorker();
  res.json({ success: true, paused: true });
});

router.post('/api/queue/resume', (_req: Request, res: Response) => {
  resumeWorker();
  res.json({ success: true, paused: false });
});

router.post('/api/queue/clear', (_req: Request, res: Response) => {
  clearQueue();
  res.json({ success: true });
});

router.get('/api/queue/current', (_req: Request, res: Response) => {
  const current = getCurrentProcessing();
  if (current) {
    res.json(current);
  } else {
    res.json(null);
  }
});

router.get('/api/analysis/status', (_req: Request, res: Response) => {
  try {
    const stats = getQueueStats();
    const progress = getQueueProgress();
    
    // Estimate 3 seconds per pending/processing item
    const averageTimePerItemMs = 3000;
    const remainingCount = stats.pending + stats.processing;
    const estimatedRemainingTimeSec = Math.round((remainingCount * averageTimePerItemMs) / 1000);

    res.json({
      processed: stats.done,
      total: stats.total,
      errors: stats.error,
      estimatedRemainingTimeSeconds: estimatedRemainingTimeSec,
      workerRunning: !isPaused(),
      progress
    });
  } catch (err: any) {
    logger.error('Erro ao obter status da análise', err);
    res.status(500).json({ error: err.message || 'Erro interno' });
  }
});

export default router;
