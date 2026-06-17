import { Router, Request, Response } from 'express';
import { getDatabase, getCategories, getStatsByType, getDocumentsByType, getDocumentsNeedingReview, getAllDocuments, updateFileClassification, updateFileEntities, saveDatabase as dbSave } from '../database';
import { getDocTypeLabel, DOC_TYPES, classifyDocument } from '../analysis/classifier';
import { extractEntities, serializeEntities } from '../analysis/entityExtractor';
import { getDynamicTables } from '../analysis/dynamicTableGenerator';

const router = Router();

router.get('/api/operational/overview', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const totalStmt = db.prepare('SELECT COUNT(*) as c FROM files');
  totalStmt.step();
  const totalFiles = Number(totalStmt.getAsObject().c);
  totalStmt.free();

  const extractedStmt = db.prepare("SELECT COUNT(*) as c FROM document_text WHERE status = 'done'");
  extractedStmt.step();
  const extractedFiles = Number(extractedStmt.getAsObject().c);
  extractedStmt.free();

  const recentStmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.doc_type, f.last_modified
    FROM files f
    ORDER BY f.last_modified DESC
    LIMIT 5
  `);
  const recent: any[] = [];
  while (recentStmt.step()) {
    const row = recentStmt.getAsObject() as any;
    recent.push({
      id: Number(row.id),
      name: String(row.name),
      extension: String(row.extension || ''),
      docType: String(row.doc_type || 'outro'),
      lastModified: String(row.last_modified || ''),
    });
  }
  recentStmt.free();

  const types = getStatsByType();
  const typesWithLabels = types.map(t => ({
    type: t.docType,
    label: getDocTypeLabel(t.docType as any),
    count: t.count,
  }));

  res.json({
    totalDocuments: totalFiles,
    documentsWithText: extractedFiles,
    categories: getCategories(),
    types: typesWithLabels,
    recentDocuments: recent,
    lastUpdated: new Date().toISOString(),
    importedTables: getDynamicTables().length,
    importedRows: getDynamicTables().reduce((sum: number, t: any) => sum + (t.rowCount || 0), 0),
  });
});

router.get('/api/operational/alerts', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const alerts: any[] = [];

  const oldCrisisStmt = db.prepare(`
    SELECT f.id, f.name, f.last_modified
    FROM files f
    WHERE f.doc_type = 'protocolo_crise'
      AND date(f.last_modified) < date('now', '-6 months')
    ORDER BY f.last_modified ASC
  `);
  while (oldCrisisStmt.step()) {
    const row = oldCrisisStmt.getAsObject() as any;
    alerts.push({
      type: 'warning',
      message: `Protocolo de crise sem atualização: "${String(row.name)}" (${String(row.last_modified || '')})`,
      fileId: Number(row.id),
      category: 'protocolos_desatualizados',
    });
  }
  oldCrisisStmt.free();

  const emptySpokespersonStmt = db.prepare(`
    SELECT COUNT(*) as c FROM files WHERE doc_type = 'porta_voz'
  `);
  emptySpokespersonStmt.step();
  if (Number(emptySpokespersonStmt.getAsObject().c) === 0) {
    alerts.push({
      type: 'critical',
      message: 'Nenhum documento classificado como Porta-Voz encontrado',
      category: 'sem_porta_voz',
    });
  }
  emptySpokespersonStmt.free();

  const emptyCalStmt = db.prepare(`
    SELECT COUNT(*) as c FROM files WHERE doc_type = 'calendario_agenda'
  `);
  emptyCalStmt.step();
  if (Number(emptyCalStmt.getAsObject().c) === 0) {
    alerts.push({
      type: 'warning',
      message: 'Nenhum calendário ou agenda encontrado',
      category: 'sem_calendario',
    });
  }
  emptyCalStmt.free();

  const needsReview = getDocumentsNeedingReview();
  for (const doc of needsReview) {
    alerts.push({
      type: 'info',
      message: `Documento "${doc.name}" marcado para revisão`,
      fileId: doc.id,
      category: 'precisa_revisao',
    });
  }

  res.json({ alerts });
});

router.get('/api/operational/sections', (_req: Request, res: Response) => {
  const sections = [
    { id: 'crise', label: 'Gerenciamento de Crises', icon: '🚨', type: 'protocolo_crise' },
    { id: 'fluxos', label: 'Fluxos de Trabalho', icon: '📋', type: 'fluxo_trabalho' },
    { id: 'portavoz', label: 'Porta-Vozes', icon: '🎤', type: 'porta_voz' },
    { id: 'calendario', label: 'Calendário de Eventos', icon: '📅', type: 'calendario_agenda' },
    { id: 'sensiveis', label: 'Assuntos Sensíveis', icon: '🔒', type: 'assunto_sensivel' },
    { id: 'normativas', label: 'Normativas e Diretrizes', icon: '📜', type: 'normativa_diretriz' },
    { id: 'campanhas', label: 'Materiais de Campanha', icon: '📰', type: 'material_campanha' },
    { id: 'relatorios', label: 'Relatórios de Atuação', icon: '📊', type: 'relatorio_atuacao' },
    { id: 'clipping', label: 'Clipping e Monitoramento', icon: '📎', type: 'clipping_monitoramento' },
    { id: 'relacionamento', label: 'Relacionamento', icon: '🤝', type: 'relacionamento' },
  ];

  const results = sections.map(s => {
    const docs = getDocumentsByType(s.type);
    return {
      ...s,
      count: docs.length,
      documents: docs.slice(0, 5).map((d: any) => ({
        id: d.id,
        name: d.name,
        summary: d.summary?.substring(0, 100) || '',
      })),
    };
  });

  res.json({ sections: results });
});

router.get('/api/operational/section/:type', (req: Request, res: Response) => {
  const docType = req.params.type as string;
  const docs = getDocumentsByType(docType);
  res.json({ type: docType, documents: docs });
});

router.post('/api/operational/reclassify', (req: Request, res: Response) => {
  const { id, docType, planSection } = req.body;
  if (!id || !docType) return res.status(400).json({ error: 'id e docType obrigatórios' });
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });
  db.run('UPDATE files SET doc_type = ?, doc_type_confidence = 1, plan_section = ?, needs_review = 0 WHERE id = ?',
    [docType, planSection || '', id]);
  dbSave();
  res.json({ success: true });
});

router.post('/api/operational/reclassify-all', async (_req: Request, res: Response) => {
  const docs = getAllDocuments();
  let classified = 0;

  for (const doc of docs) {
    const db = getDatabase();
    if (!db) continue;

    const textStmt = db.prepare("SELECT raw_text FROM document_text WHERE file_id = ? AND status = 'done'");
    textStmt.bind([doc.id]);
    const text = textStmt.step() ? String(textStmt.getAsObject().raw_text || '') : '';
    textStmt.free();

    const cls = classifyDocument(doc.name, text, doc.category);
    updateFileClassification(doc.id, cls.docType, cls.confidence, cls.planSection);

    if (text) {
      const entities = extractEntities(text);
      updateFileEntities(doc.id, serializeEntities(entities));
    }

    classified++;
  }

  res.json({ success: true, classified });
});

export default router;
