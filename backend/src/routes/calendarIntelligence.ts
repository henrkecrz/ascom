import { Router, Request, Response } from 'express';
import {
  createCalendarEvent,
  createCalendarOpportunity,
  getDayIntelligence,
  getDatabase,
  listCalendarEvents,
  listCalendarOpportunities,
  listDocumentChanges,
} from '../database';

const router = Router();

function rows(stmt: any): any[] {
  const out: any[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

router.get('/api/calendar/events', (req: Request, res: Response) => {
  res.json({ events: listCalendarEvents({
    date: req.query.date ? String(req.query.date) : undefined,
    from: req.query.from ? String(req.query.from) : undefined,
    to: req.query.to ? String(req.query.to) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  }) });
});

router.post('/api/calendar/events', (req: Request, res: Response) => {
  const event = createCalendarEvent(req.body || {});
  res.status(201).json(event);
});

router.put('/api/calendar/events/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  const allowed = ['event_date', 'title', 'description', 'event_type', 'source', 'risk_level', 'opportunity_level', 'related_file_ids', 'related_photo_event_ids', 'related_change_event_ids', 'status'];
  const updates: string[] = [];
  const values: any[] = [];
  for (const key of allowed) {
    if (req.body?.[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(Array.isArray(req.body[key]) ? JSON.stringify(req.body[key]) : req.body[key]);
    }
  }
  if (!updates.length) return res.json({ success: true });
  updates.push('updated_at = ?');
  values.push(new Date().toISOString(), id);
  db.run(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`, values);
  res.json({ success: true });
});

router.delete('/api/calendar/events/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
  const db = getDatabase();
  if (db) db.run('DELETE FROM calendar_events WHERE id = ?', [id]);
  res.json({ success: true });
});

router.get('/api/calendar/opportunities', (req: Request, res: Response) => {
  res.json({ opportunities: listCalendarOpportunities({
    date: req.query.date ? String(req.query.date) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  }) });
});

router.post('/api/calendar/opportunities/generate', (req: Request, res: Response) => {
  const date = String(req.body?.date || new Date().toISOString().slice(0, 10));
  const detail = getDayIntelligence(date);
  const opportunities: any[] = [];
  if (detail.documents?.length) {
    opportunities.push(createCalendarOpportunity({
      opportunityDate: date,
      title: `Pauta sugerida para ${date}`,
      summary: `Há ${detail.documents.length} documento(s), ${detail.photoEvents.length} evento(s) fotográfico(s) e ${detail.changes.length} mudança(s) nessa data.`,
      suggestedFormat: detail.photoEvents.length ? 'post_instagram' : 'nota_site',
      priority: detail.changes.length ? 8 : 5,
      sourcePayload: detail,
    }));
  }
  res.json({ date, opportunities });
});

router.put('/api/calendar/opportunities/:id/status', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
  const db = getDatabase();
  if (db) db.run('UPDATE calendar_content_opportunities SET status = ? WHERE id = ?', [req.body?.status || 'reviewed', id]);
  res.json({ success: true });
});

router.get('/api/calendar/day/:date', (req: Request, res: Response) => {
  res.json(getDayIntelligence(req.params.date));
});

router.get('/api/calendar/month/:year/:month', (req: Request, res: Response) => {
  const year = String(req.params.year);
  const month = String(req.params.month).padStart(2, '0');
  const from = `${year}-${month}-01`;
  const nextMonth = Number(month) === 12 ? `${Number(year) + 1}-01-01` : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`;
  const db = getDatabase();
  if (!db) return res.json({ from, to: nextMonth, documents: [], photoEvents: [], changes: [], events: [], opportunities: [] });
  const docs = db.prepare('SELECT * FROM files WHERE substr(last_modified, 1, 10) >= ? AND substr(last_modified, 1, 10) < ? ORDER BY last_modified DESC LIMIT 500');
  docs.bind([from, nextMonth]);
  const photos = db.prepare('SELECT * FROM photo_events WHERE event_date >= ? AND event_date < ? ORDER BY event_date DESC LIMIT 500');
  photos.bind([from, nextMonth]);
  res.json({
    from,
    to: nextMonth,
    documents: rows(docs),
    photoEvents: rows(photos),
    changes: listDocumentChanges({ limit: 500 }).filter((c: any) => String(c.detected_at || '').slice(0, 10) >= from && String(c.detected_at || '').slice(0, 10) < nextMonth),
    events: listCalendarEvents({ from, to: nextMonth, limit: 500 }),
    opportunities: listCalendarOpportunities({ limit: 500 }).filter((o: any) => String(o.opportunity_date || '') >= from && String(o.opportunity_date || '') < nextMonth),
  });
});

router.get('/api/calendar/week/:year/:week', (req: Request, res: Response) => {
  res.json({ year: Number(req.params.year), week: Number(req.params.week), message: 'Consulta semanal preparada para evolução de frontend.', events: [] });
});

router.get('/api/calendar/changes/:date', (req: Request, res: Response) => {
  const date = req.params.date;
  const changes = listDocumentChanges({ limit: 500 }).filter((c: any) => String(c.detected_at || '').slice(0, 10) === date);
  res.json({ date, changes });
});

export default router;
