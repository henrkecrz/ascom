import { Router, Request, Response } from 'express';
import { logger } from '../lib/logger';
import { getQuickAnswers, processQuestion } from '../services/consultService';

const router = Router();

router.get('/api/consult/quick-answers', (_req: Request, res: Response) => {
  res.json(getQuickAnswers());
});

router.post('/api/consult', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Pergunta é obrigatória' });
    }
    const result = await processQuestion(question);
    res.json(result);
  } catch (e: any) {
    logger.error('Erro no consult handler', { message: e.message });
    res.status(500).json({ error: e.message || 'Erro interno' });
  }
});

export default router;
