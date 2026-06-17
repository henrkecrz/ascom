import { Router, Request, Response } from 'express';
import { searchDocuments, getSuggestions } from '../services/searchService';

const router = Router();

router.get('/api/search', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) return res.json({ results: [], total: 0 });

  try {
    const result = searchDocuments(query);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro na busca' });
  }
});

router.get('/api/search/suggestions', (_req: Request, res: Response) => {
  const result = getSuggestions();
  res.json(result);
});

export default router;
