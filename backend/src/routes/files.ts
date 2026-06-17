import { Router, Request, Response } from 'express';
import { queryFiles, getCategories, getFileTypes, getDatabase } from '../database';
import { getAllDataSources } from '../db/dataSources';
import { sanitizePath } from '../middleware/validate';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();

function getAllowedRoots(): string[] {
  return getAllDataSources(true).map(s => path.resolve(s.path));
}

router.get('/api/files', (req: Request, res: Response) => {
  const { category, extension, search, parent_folder, limit, offset } = req.query;

  const result = queryFiles({
    category: category as string | undefined,
    extension: extension as string | undefined,
    search: search as string | undefined,
    parent_folder: parent_folder as string | undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  });

  res.json(result);
});

router.get('/api/categories', (_req: Request, res: Response) => {
  const categories = getCategories();
  res.json(categories);
});

router.get('/api/file-types', (_req: Request, res: Response) => {
  const types = getFileTypes();
  res.json(types);
});

router.get('/api/stats', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM files');
  countStmt.step();
  const totalFiles = Number(countStmt.getAsObject().count);
  countStmt.free();

  const sizeStmt = db.prepare("SELECT COALESCE(SUM(size_bytes), 0) as total FROM files");
  sizeStmt.step();
  const totalSize = Number(sizeStmt.getAsObject().total);
  sizeStmt.free();

  const categories = getCategories();
  const types = getFileTypes();

  res.json({
    totalFiles,
    totalSize,
    categories,
    fileTypes: types,
  });
});

router.post('/api/open', (req: Request, res: Response) => {
  const filePath = sanitizePath(String(req.body.path || req.body.filePath || ''));
  if (!filePath) {
    return res.status(400).json({ error: 'Caminho não informado' });
  }

  const resolved = path.resolve(filePath);
  const allowedRoots = getAllowedRoots();
  
  const isAllowed = allowedRoots.some(root =>
    resolved.toLowerCase().startsWith(root.toLowerCase())
  );
  
  if (!isAllowed) {
    return res.status(403).json({ error: 'Acesso negado: diretório não permitido' });
  }

  // Sanitize path: allow Unicode (Portuguese accents), block shell metacharacters
  if (/[<>"'|?*;`$(){}\n\r]/.test(resolved)) {
    return res.status(400).json({ error: 'Caminho contém caracteres inválidos de segurança' });
  }

  const child = spawn('explorer.exe', [resolved], { shell: false });
  
  child.on('error', (err) => {
    return res.status(500).json({ error: 'Erro ao abrir arquivo' });
  });

  child.unref();
  res.json({ success: true });
});

export default router;
