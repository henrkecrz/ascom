import { Router, Request, Response } from 'express';
import { getFileById, getRelatedDocuments, getDocumentSections, getFileBlob } from '../database';
import fs from 'fs';
import path from 'path';

const router = Router();

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

function getContentType(ext: string | null): string | null {
  if (!ext) return null;
  return MIME_TYPES[ext.toLowerCase()] || null;
}

router.get('/api/documents/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const file = getFileById(id);
  if (!file) return res.status(404).json({ error: 'Documento não encontrado' });

  res.json(file);
});

router.get('/api/documents/:id/view', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const file = getFileById(id);
  if (!file) return res.status(404).json({ error: 'Documento não encontrado' });

  // Try to serve from database blob first
  const blob = getFileBlob(id);
  if (blob) {
    const contentType = getContentType(file.extension);
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', blob.length.toString());
    res.send(blob);
    return;
  }

  // Fallback to filesystem
  const resolved = path.resolve(file.full_path);
  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'Arquivo físico não encontrado no servidor' });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = getContentType(ext);
  if (contentType) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
  }

  res.sendFile(resolved);
});

router.get('/api/documents/:id/related', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const related = getRelatedDocuments(id);
  res.json(related);
});

router.get('/api/documents/:id/sections', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const sections = getDocumentSections(id);
  res.json(sections);
});

export default router;
