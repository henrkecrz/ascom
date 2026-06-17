import { Router, Request, Response } from 'express';
import { getTalkingPoints, getTalkingPointCategories } from '../database';

const router = Router();

router.get('/api/talking-points', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const topics = getTalkingPoints(category || undefined);
  res.json({ count: topics.length, topics });
});

router.get('/api/talking-points/categories', (_req: Request, res: Response) => {
  const categories = getTalkingPointCategories();
  res.json({ categories });
});

export default router;
