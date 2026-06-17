import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  getAllPhotoEvents, getPhotoEventById,
  getPhotosByEvent, getDocumentsForPhotoEvent, getPhotosForDocument,
  getFileBlob
} from '../database';
import { indexPhotos } from '../processors/photoIndexer';

const router = Router();
const THUMB_DIR = path.join(__dirname, '..', '..', 'data', 'photos', 'thumbs');

const PHOTO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.heic': 'image/heic',
  '.bmp': 'image/bmp', '.tiff': 'image/tiff', '.tif': 'image/tiff',
};

router.get('/api/photos/events', (_req: Request, res: Response) => {
  const events = getAllPhotoEvents();
  res.json(events);
});

router.get('/api/photos/events/:id', (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const event = getPhotoEventById(id);
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

  const photos = getPhotosByEvent(id);
  const documents = getDocumentsForPhotoEvent(id);

  res.json({ ...event, photos, documents });
});

router.get('/api/photos/by-document/:docId', (req: Request, res: Response) => {
  const docId = parseInt(String(req.params.docId), 10);
  if (isNaN(docId)) return res.status(400).json({ error: 'ID inválido' });

  const photos = getPhotosForDocument(docId);
  res.json(photos);
});

router.get('/api/photos/thumbnail', (req: Request, res: Response) => {
  const thumbPath = req.query.path as string | undefined;
  const fileId = req.query.fileId ? parseInt(String(req.query.fileId), 10) : undefined;

  // Try serving from DB blob if fileId provided
  if (fileId && !isNaN(fileId)) {
    const blob = getFileBlob(fileId);
    if (blob) {
      const ext = path.extname(thumbPath || '').toLowerCase();
      res.type(PHOTO_MIME[ext] || 'image/jpeg');
      res.send(blob);
      return;
    }
  }

  if (!thumbPath) return res.status(400).json({ error: 'Path não informado' });

  const fullPath = path.resolve(thumbPath);
  if (!fullPath.startsWith(THUMB_DIR)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Thumbnail não encontrado' });

  res.sendFile(fullPath);
});

router.get('/api/photos/serve', (req: Request, res: Response) => {
  const sourcePath = req.query.path as string | undefined;
  const fileId = req.query.fileId ? parseInt(String(req.query.fileId), 10) : undefined;

  // Try serving from DB blob if fileId provided
  if (fileId && !isNaN(fileId)) {
    const blob = getFileBlob(fileId);
    if (blob) {
      const ext = path.extname(sourcePath || '').toLowerCase();
      res.type(PHOTO_MIME[ext] || 'application/octet-stream');
      res.send(blob);
      return;
    }
  }

  if (!sourcePath) return res.status(400).json({ error: 'Path não informado' });

  if (!fs.existsSync(sourcePath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

  const ext = path.extname(sourcePath).toLowerCase();

  res.type(PHOTO_MIME[ext] || 'application/octet-stream');
  res.sendFile(sourcePath);
});

router.post('/api/photos/index', async (_req: Request, res: Response) => {
  try {
    const result = await indexPhotos(false);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/photos/reindex', async (_req: Request, res: Response) => {
  try {
    const db = require('../database');
    db.clearPhotoIndex();
    const result = await indexPhotos(true);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
