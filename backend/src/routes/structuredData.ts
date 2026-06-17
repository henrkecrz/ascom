import { Router, Request, Response } from 'express';
import { queryStructuredData, deleteStructuredData } from '../database';
import { importXlsxStructured } from '../processors/xlsxIntelligentImporter';
import { getDatabase } from '../database';

const router = Router();

router.get('/api/structured-data/schemas', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.json({ schemas: [] });
  const stmt = db.prepare('SELECT DISTINCT schema_type, COUNT(*) as count FROM structured_data GROUP BY schema_type ORDER BY count DESC');
  const schemas: { type: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    schemas.push({ type: String(row.schema_type), count: Number(row.count) });
  }
  stmt.free();
  res.json({ schemas });
});

router.get('/api/structured-data/themes', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.json({ themes: [] });
  const stmt = db.prepare('SELECT DISTINCT theme, COUNT(*) as count FROM structured_data WHERE theme IS NOT NULL AND theme != "" GROUP BY theme ORDER BY count DESC');
  const themes: { theme: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    themes.push({ theme: String(row.theme), count: Number(row.count) });
  }
  stmt.free();
  res.json({ themes });
});

router.get('/api/structured-data', (req: Request, res: Response) => {
  const schema_type = req.query.schema_type as string | undefined;
  const theme = req.query.theme as string | undefined;
  const source_file_id = req.query.source_file_id ? Number(req.query.source_file_id) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  const result = queryStructuredData({ schema_type, theme, source_file_id, limit, offset });
  res.json(result);
});

router.get('/api/structured-data/:id', (req: Request, res: Response) => {
  const result = queryStructuredData({ limit: 1 });
  const item = result.data.find((d: any) => d.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Não encontrado' });
  res.json(item);
});

router.delete('/api/structured-data/:id', (req: Request, res: Response) => {
  deleteStructuredData(Number(req.params.id));
  res.json({ success: true });
});

export default router;
