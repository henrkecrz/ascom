import { Router, Request, Response } from 'express';
import { orchestrateAgents } from '../agents/orchestrator';
import { listAgents } from '../agents/registry';
import { AgentRequest } from '../agents/types';
import { logger } from '../lib/logger';

const router = Router();

router.get('/api/agents', (_req: Request, res: Response) => {
  res.json({ agents: listAgents() });
});

router.post('/api/agents/ask', async (req: Request, res: Response) => {
  try {
    const payload = req.body as AgentRequest;
    if (!payload.question || typeof payload.question !== 'string') {
      return res.status(400).json({ error: 'question é obrigatório' });
    }

    const result = await orchestrateAgents({
      question: payload.question,
      mode: payload.mode || 'auto',
      context: payload.context || {},
    });

    res.json({
      success: true,
      plan: result.plan,
      response: result.response,
    });
  } catch (err: any) {
    logger.error('Erro na rota de agentes', { message: err.message });
    res.status(500).json({ error: err.message || 'Erro ao executar agentes' });
  }
});

export default router;
