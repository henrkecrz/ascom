import { Router, Request, Response } from 'express';
import { generateWorkloadSummary } from '../analysis/workloadAdvisor';

const router = Router();

router.get('/api/advisor/summary', (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const summary = generateWorkloadSummary(year);
  res.json(summary);
});

router.get('/api/advisor/recommendations', (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const summary = generateWorkloadSummary(year);
  res.json({
    recommendations: summary.recommendations.slice(0, 5),
    topPriority: summary.topPriorityMonth,
    completionRate: summary.completionRate,
  });
});

export default router;
