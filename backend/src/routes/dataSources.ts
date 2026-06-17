import { Router, Request, Response } from 'express';
import { getAllDataSources, getDataSourceByPath, insertDataSource, updateDataSource, deleteDataSource } from '../db/dataSources';
import path from 'path';
import fs from 'fs';

const router = Router();

// List all data sources
router.get('/api/data-sources', (_req: Request, res: Response) => {
  const sources = getAllDataSources();
  res.json(sources);
});

// Add a new data source
router.post('/api/data-sources', (req: Request, res: Response) => {
  const { path: sourcePath, type, label, has_photos } = req.body;
  if (!sourcePath || !type || !label) {
    return res.status(400).json({ error: 'path, type e label são obrigatórios' });
  }
  if (type !== 'documentos' && type !== 'fotos') {
    return res.status(400).json({ error: 'type deve ser "documentos" ou "fotos"' });
  }
  const resolved = path.resolve(sourcePath);
  if (!fs.existsSync(resolved)) {
    return res.status(400).json({ error: `Diretório não encontrado: ${resolved}` });
  }
  const existing = getDataSourceByPath(resolved);
  if (existing) {
    return res.status(409).json({ error: `Fonte duplicada: "${existing.label}" já utiliza este caminho`, existingId: existing.id });
  }
  const id = insertDataSource({ path: resolved, type, label, has_photos: has_photos ? 1 : 0 });
  res.json({ id, success: true });
});

// Update a data source
router.put('/api/data-sources/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { path: sourcePath, label, active, has_photos } = req.body;
  if (sourcePath) {
    const resolved = path.resolve(sourcePath);
    const existing = getDataSourceByPath(resolved);
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: `Fonte duplicada: "${existing.label}" já utiliza este caminho`, existingId: existing.id });
    }
    updateDataSource(id, { path: resolved, label, active: active !== undefined ? (active ? 1 : 0) : undefined, has_photos: has_photos !== undefined ? (has_photos ? 1 : 0) : undefined });
  } else {
    updateDataSource(id, { label, active: active !== undefined ? (active ? 1 : 0) : undefined, has_photos: has_photos !== undefined ? (has_photos ? 1 : 0) : undefined });
  }
  res.json({ success: true });
});

// Delete a data source
router.delete('/api/data-sources/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  deleteDataSource(id);
  res.json({ success: true });
});

// Browse directories - list contents of a path for navigation
router.get('/api/data-sources/browse', (req: Request, res: Response) => {
  const dirPath = req.query.path as string || '';
  let targetPath: string;
  if (!dirPath) {
    // List root drives on Windows
    const drives = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const results: { name: string; path: string; isDirectory: boolean }[] = [];
    for (const letter of drives) {
      const drivePath = `${letter}:\\`;
      try {
        if (fs.existsSync(drivePath)) {
          results.push({ name: drivePath, path: drivePath, isDirectory: true });
        }
      } catch {}
    }
    return res.json(results);
  }
  targetPath = path.resolve(dirPath);
  try {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const results = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(targetPath, e.name),
        isDirectory: true,
      }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: `Erro ao ler diretório: ${targetPath}` });
  }
});

export default router;
