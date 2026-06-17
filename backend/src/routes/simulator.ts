import { Router, Request, Response } from 'express';
import { getScenarios, getScenarioCategories, insertScenario, reclassifyAllScenarios } from '../database';
import { logger } from '../lib/logger';

const router = Router();

router.get('/api/simulator/scenarios', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const scenarios = getScenarios(category || undefined);
  res.json({ count: scenarios.length, scenarios });
});

router.get('/api/simulator/categories', (_req: Request, res: Response) => {
  const categories = getScenarioCategories();
  res.json({ categories });
});

router.post('/api/simulator/evaluate', (req: Request, res: Response) => {
  const { scenarioId, optionId } = req.body;
  if (!scenarioId || !optionId) {
    return res.status(400).json({ error: 'scenarioId e optionId são obrigatórios' });
  }

  const scenarios = getScenarios();
  const scenario = scenarios.find(s => s.id === parseInt(scenarioId, 10));
  if (!scenario) return res.status(404).json({ error: 'Cenário não encontrado' });

  const option = scenario.options.find(o => o.id === optionId);
  if (!option) return res.status(404).json({ error: 'Opção não encontrada' });

  res.json({
    success: true,
    points: option.points,
    feedback: option.feedback
  });
});

router.post('/api/simulator/reclassify', (_req: Request, res: Response) => {
  try {
    const result = reclassifyAllScenarios();
    logger.info('Reclassificação de cenários concluída', result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    logger.error('Erro ao reclassificar cenários', { error: err.message });
    res.status(500).json({ error: err.message || 'Erro ao reclassificar' });
  }
});

export default router;

