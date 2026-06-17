import { Router, Request, Response } from 'express';
import { previewImport, confirmImport, getTables, getRelationships, getJobStatus } from '../services/importService';
import { logger } from '../lib/logger';

const router = Router();

router.post('/api/import/preview', async (req: Request, res: Response) => {
  try {
    const { sourceId } = req.body;
    if (!sourceId) return res.status(400).json({ error: 'sourceId é obrigatório' });
    const result = await previewImport(sourceId);
    res.json(result);
  } catch (err: any) {
    logger.error('Preview failed', { error: err.message });
    res.status(500).json({ error: err.message || 'Erro ao gerar preview' });
  }
});

router.post('/api/import/confirm', async (req: Request, res: Response) => {
  try {
    const { sourceId, fileIndices, schemaOverrides } = req.body;
    if (!sourceId) return res.status(400).json({ error: 'sourceId é obrigatório' });
    const result = await confirmImport(sourceId, fileIndices, schemaOverrides);
    res.json(result);
  } catch (err: any) {
    logger.error('Import failed', { error: err.message });
    res.status(500).json({ error: err.message || 'Erro ao importar' });
  }
});

router.get('/api/import/tables', (_req: Request, res: Response) => {
  res.json(getTables());
});

router.get('/api/import/relationships', (_req: Request, res: Response) => {
  res.json(getRelationships());
});

router.get('/api/import/status/:jobId', (req: Request, res: Response) => {
  const status = getJobStatus(String(req.params.jobId));
  if (!status) return res.status(404).json({ error: 'Job não encontrado' });
  res.json(status);
});

import { getImportHistoryList, undoImportTask } from '../services/importService';

router.get('/api/import/history', (_req: Request, res: Response) => {
  try {
    const history = getImportHistoryList();
    res.json(history);
  } catch (err: any) {
    logger.error('Failed to get import history', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/import/undo/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const result = undoImportTask(id);
    res.json(result);
  } catch (err: any) {
    logger.error('Failed to undo import', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
