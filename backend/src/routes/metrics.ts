import { Router, Request, Response } from 'express';
import { getDatabase } from '../database';

const router = Router();

router.get('/api/metrics', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const totalDocs = db.prepare('SELECT COUNT(*) as c FROM files');
  totalDocs.step();
  const totalDocuments = Number(totalDocs.getAsObject().c);
  totalDocs.free();

  const classifiedDocs = db.prepare("SELECT COUNT(*) as c FROM files WHERE doc_type != 'outro' AND doc_type IS NOT NULL");
  classifiedDocs.step();
  const classified = Number(classifiedDocs.getAsObject().c);
  classifiedDocs.free();

  const extractedDocs = db.prepare("SELECT COUNT(*) as c FROM document_text WHERE status = 'done'");
  extractedDocs.step();
  const extracted = Number(extractedDocs.getAsObject().c);
  extractedDocs.free();

  const structData = db.prepare('SELECT COUNT(*) as c FROM structured_data');
  structData.step();
  const structuredRows = Number(structData.getAsObject().c);
  structData.free();

  const docSections = db.prepare('SELECT COUNT(*) as c FROM document_sections');
  docSections.step();
  const sections = Number(docSections.getAsObject().c);
  docSections.free();

  const relations = db.prepare('SELECT COUNT(*) as c FROM knowledge_relations');
  relations.step();
  const knowledgeRels = Number(relations.getAsObject().c);
  relations.free();

  const feedback = db.prepare('SELECT COUNT(*) as c FROM classification_feedback');
  feedback.step();
  const feedbackCount = Number(feedback.getAsObject().c);
  feedback.free();

  const settings = db.prepare('SELECT COUNT(*) as c FROM settings');
  settings.step();
  const settingsCount = Number(settings.getAsObject().c);
  settings.free();

  const typesStmt = db.prepare('SELECT doc_type, COUNT(*) as count FROM files GROUP BY doc_type ORDER BY count DESC');
  const typeBreakdown: Record<string, number> = {};
  while (typesStmt.step()) {
    const row = typesStmt.getAsObject() as any;
    typeBreakdown[String(row.doc_type)] = Number(row.count);
  }
  typesStmt.free();

  res.json({
    totalDocuments,
    classified,
    extractionRate: totalDocuments > 0 ? Math.round((extracted / totalDocuments) * 100) : 0,
    structuredDataRows: structuredRows,
    documentSections: sections,
    knowledgeRelations: knowledgeRels,
    classificationFeedback: feedbackCount,
    settingsCount,
    typeBreakdown,
    timestamp: new Date().toISOString(),
  });
});

export default router;
