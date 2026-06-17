import { Router, Request, Response } from 'express';
import { getDashboardData } from '../services/dashboardService';

const router = Router();

router.get('/api/dashboard', (_req: Request, res: Response) => {
  try {
    const data = getDashboardData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao carregar dashboard' });
  }
});

export default router;
