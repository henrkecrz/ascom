import { Router, Request, Response } from 'express';
import {
  addPhotoTag,
  createPhotoHighlight,
  deletePhotoTag,
  getDatabase,
  listDocumentChangesByFile,
  listPhotoHighlights,
  listPhotoTags,
  listPhotoUsage,
  listUnusedPhotos,
  recordPhotoUsage,
} from '../database';

const router = Router();

function rows(stmt: any): any[] {
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

router.get('/api/photos/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  const db = getDatabase();
  if (!db) return res.json({ events: [], photos: [] });
  const eventStmt = db.prepare(`SELECT * FROM photo_events WHERE lower(event_name) LIKE ? OR lower(month_folder) LIKE ? ORDER BY event_date DESC LIMIT 100`);
  eventStmt.bind([`%${q}%`, `%${q}%`]);
  const photoStmt = db.prepare(`SELECT p.*, pe.event_name, pe.event_date FROM photos p JOIN photo_events pe ON pe.id = p.event_id WHERE lower(p.filename) LIKE ? OR lower(pe.event_name) LIKE ? ORDER BY p.indexed_at DESC LIMIT 100`);
  photoStmt.bind([`%${q}%`, `%${q}%`]);
  res.json({ events: rows(eventStmt), photos: rows(photoStmt) });
});

router.get('/api/photos/tags', (req: Request, res: Response) => {
  const photoId = req.query.photoId ? Number(req.query.photoId) : undefined;
  res.json({ tags: listPhotoTags(photoId) });
});

router.post('/api/photos/:id/tags', (req: Request, res: Response) => {
  const photoId = Number(req.params.id);
  if (!Number.isFinite(photoId)) return res.status(400).json({ error: 'ID inválido' });
  const tag = String(req.body?.tag || '').trim();
  if (!tag) return res.status(400).json({ error: 'Tag obrigatória' });
  res.status(201).json(addPhotoTag(photoId, tag, req.body?.source || 'manual', Number(req.body?.confidence || 1)));
});

router.delete('/api/photos/:id/tags/:tag', (req: Request, res: Response) => {
  const photoId = Number(req.params.id);
  if (!Number.isFinite(photoId)) return res.status(400).json({ error: 'ID inválido' });
  deletePhotoTag(photoId, req.params.tag);
  res.json({ success: true });
});

router.post('/api/photos/:id/use', (req: Request, res: Response) => {
  const photoId = Number(req.params.id);
  if (!Number.isFinite(photoId)) return res.status(400).json({ error: 'ID inválido' });
  res.status(201).json(recordPhotoUsage({ ...req.body, photoId }));
});

router.get('/api/photos/usage', (req: Request, res: Response) => {
  res.json({ usage: listPhotoUsage({
    photoId: req.query.photoId ? Number(req.query.photoId) : undefined,
    eventId: req.query.eventId ? Number(req.query.eventId) : undefined,
  }) });
});

router.get('/api/photos/unused', (req: Request, res: Response) => {
  res.json({ photos: listUnusedPhotos(req.query.limit ? Number(req.query.limit) : 200) });
});

router.get('/api/photos/highlights', (req: Request, res: Response) => {
  res.json({ highlights: listPhotoHighlights({
    eventId: req.query.eventId ? Number(req.query.eventId) : undefined,
    type: req.query.type ? String(req.query.type) : undefined,
  }) });
});

router.post('/api/photos/highlights/generate', (req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.json({ highlights: [] });
  const eventId = req.body?.eventId ? Number(req.body.eventId) : undefined;
  const stmt = eventId
    ? db.prepare('SELECT * FROM photos WHERE event_id = ? ORDER BY width * height DESC, file_size DESC LIMIT 10')
    : db.prepare('SELECT * FROM photos ORDER BY width * height DESC, file_size DESC LIMIT 10');
  if (eventId) stmt.bind([eventId]);
  const photos = rows(stmt);
  const highlights = photos.map((photo) => createPhotoHighlight({
    photoId: photo.id,
    eventId: photo.event_id,
    highlightType: req.body?.highlightType || 'site',
    score: Number(photo.width || 0) * Number(photo.height || 0),
    reason: 'Foto sugerida por dimensão/resolução disponível no acervo.',
  }));
  res.json({ highlights });
});

router.put('/api/photos/highlights/:id/approve', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
  const db = getDatabase();
  if (db) db.run('UPDATE photo_highlights SET reason = ? WHERE id = ?', [req.body?.reason || 'Aprovada para uso.', id]);
  res.json({ success: true });
});

router.get('/api/photos/events/:id/content-suggestions', (req: Request, res: Response) => {
  const eventId = Number(req.params.id);
  if (!Number.isFinite(eventId)) return res.status(400).json({ error: 'ID inválido' });
  const db = getDatabase();
  if (!db) return res.json({ suggestions: [] });
  const evt = db.prepare('SELECT * FROM photo_events WHERE id = ?');
  evt.bind([eventId]);
  const event = evt.step() ? evt.getAsObject() as any : null;
  evt.free();
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({
    event,
    suggestions: [
      { format: 'post_instagram', title: `Card sobre ${event.event_name}`, summary: 'Usar fotos do evento como evidência visual da atuação.' },
      { format: 'nota_site', title: `Registro institucional: ${event.event_name}`, summary: 'Criar nota curta com galeria de apoio.' },
      { format: 'relatorio', title: `Destaque visual — ${event.event_name}`, summary: 'Incluir no relatório como evidência visual do período.' },
    ],
  });
});

router.get('/api/photos/events/:id/related-timeline', (req: Request, res: Response) => {
  const eventId = Number(req.params.id);
  if (!Number.isFinite(eventId)) return res.status(400).json({ error: 'ID inválido' });
  const db = getDatabase();
  if (!db) return res.json({ timeline: [] });
  const stmt = db.prepare('SELECT * FROM photo_events WHERE id = ?');
  stmt.bind([eventId]);
  const event = stmt.step() ? stmt.getAsObject() as any : null;
  stmt.free();
  res.json({ timeline: event ? [{ date: event.event_date, type: 'photo_event', title: event.event_name, event }] : [] });
});

router.get('/api/photos/events/:id/related-changes', (req: Request, res: Response) => {
  const eventId = Number(req.params.id);
  if (!Number.isFinite(eventId)) return res.status(400).json({ error: 'ID inválido' });
  const db = getDatabase();
  if (!db) return res.json({ changes: [] });
  const stmt = db.prepare('SELECT document_id FROM photo_document_links WHERE photo_event_id = ?');
  stmt.bind([eventId]);
  const links = rows(stmt);
  const changes = links.flatMap((link) => listDocumentChangesByFile(Number(link.document_id)));
  res.json({ changes });
});

export default router;
