import { Router, Request, Response } from 'express';
import { getGraphData } from '../database';

const router = Router();

router.get('/api/graph', (_req: Request, res: Response) => {
  const data = getGraphData();
  res.json(data);
});

export default router;
