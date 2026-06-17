import { Router, Request, Response } from 'express';
import { getDatabase, setSetting, getSetting } from '../database';

const router = Router();

router.get('/api/crisis/protocols', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const stmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.last_modified, f.plan_section,
           ds.summary, ds.keywords, ds.word_count
    FROM files f
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    WHERE f.doc_type = 'protocolo_crise'
    ORDER BY f.doc_type_confidence DESC, f.last_modified DESC
  `);

  const protocols: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    protocols.push({
      id: Number(row.id),
      name: String(row.name),
      extension: String(row.extension || ''),
      lastModified: String(row.last_modified || ''),
      summary: String(row.summary || ''),
      keywords: String(row.keywords || ''),
      wordCount: Number(row.word_count || 0),
      planSection: String(row.plan_section || ''),
    });
  }
  stmt.free();

  res.json({ count: protocols.length, protocols });
});

router.get('/api/crisis/spokespersons', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const stmt = db.prepare(`
    SELECT f.id, f.name, f.entities, ds.summary
    FROM files f
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    WHERE f.doc_type = 'porta_voz'
    ORDER BY f.doc_type_confidence DESC
  `);

  const spokes: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    let persons: string[] = [];
    try {
      const entities = JSON.parse(String(row.entities || '{}'));
      persons = entities.persons || [];
    } catch {}
    spokes.push({
      id: Number(row.id),
      name: String(row.name),
      summary: String(row.summary || ''),
      persons,
    });
  }
  stmt.free();

  res.json({ count: spokes.length, spokespersons: spokes });
});

router.get('/api/crisis/checklist', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const steps = [
    { order: 1, step: 'Identificar o tipo e gravidade da crise', status: 'check' },
    { order: 2, step: 'Acionar o porta-voz designado', status: 'check' },
    { order: 3, step: 'Consultar protocolo de crise aplicável', status: 'check' },
    { order: 4, step: 'Preparar nota oficial / posicionamento', status: 'check' },
    { order: 5, step: 'Informar presidente e diretoria', status: 'check' },
    { order: 6, step: 'Comunicar colaboradores internamente', status: 'check' },
    { order: 7, step: 'Monitorar repercussão na imprensa', status: 'check' },
    { order: 8, step: 'Registrar ações no relatório de crise', status: 'check' },
  ];

  const protocolsStmt = db.prepare("SELECT COUNT(*) as c FROM files WHERE doc_type = 'protocolo_crise'");
  protocolsStmt.step();
  const hasProtocols = Number(protocolsStmt.getAsObject().c) > 0;
  protocolsStmt.free();

  const spokesStmt = db.prepare("SELECT COUNT(*) as c FROM files WHERE doc_type = 'porta_voz'");
  spokesStmt.step();
  const hasSpokespersons = Number(spokesStmt.getAsObject().c) > 0;
  spokesStmt.free();

  res.json({
    checklist: steps,
    readiness: {
      hasProtocols,
      hasSpokespersons,
      score: (hasProtocols ? 50 : 0) + (hasSpokespersons ? 50 : 0),
    },
  });
});

router.get('/api/crisis/checklist/progress', (_req: Request, res: Response) => {
  const raw = getSetting('crisis_checklist_progress');
  res.json({ progress: raw ? JSON.parse(raw) : {} });
});

router.put('/api/crisis/checklist/progress', (req: Request, res: Response) => {
  const { progress } = req.body;
  if (typeof progress !== 'object') {
    return res.status(400).json({ error: 'Formato inválido' });
  }
  setSetting('crisis_checklist_progress', JSON.stringify(progress));
  res.json({ success: true });
});

export default router;
