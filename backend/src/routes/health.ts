import { Router, Request, Response } from 'express';
import { getDatabase, getStatsByType } from '../database';
import { getDocTypeLabel } from '../analysis/classifier';

const router = Router();

router.get('/api/health', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({
    status: 'ok',
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

router.get('/api/plan/health', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  db.run('BEGIN TRANSACTION');
  const types = getStatsByType();
  const totalStmt = db.prepare('SELECT COUNT(*) as c FROM files');
  totalStmt.step();
  const total = Number(totalStmt.getAsObject().c);
  totalStmt.free();

  const coverage = types.map(t => ({
    type: t.docType,
    label: getDocTypeLabel(t.docType as any),
    count: t.count,
    percentage: total > 0 ? Math.round((t.count / total) * 100) : 0,
  }));

  const sections = [
    { name: 'Gerenciamento de Crises', requiredTypes: ['protocolo_crise'], critical: true },
    { name: 'Porta-Vozes', requiredTypes: ['porta_voz'], critical: true },
    { name: 'Fluxos de Trabalho', requiredTypes: ['fluxo_trabalho'], critical: false },
    { name: 'Calendário de Eventos', requiredTypes: ['calendario_agenda'], critical: false },
    { name: 'Assuntos Sensíveis', requiredTypes: ['assunto_sensivel'], critical: false },
    { name: 'Normativas', requiredTypes: ['normativa_diretriz'], critical: false },
  ];

  const sectionStatus = sections.map(s => {
    const found = s.requiredTypes.filter(t => types.some(ct => ct.docType === t && ct.count > 0));
    return {
      name: s.name,
      covered: found.length > 0,
      count: s.requiredTypes.reduce((sum, t) => {
        const match = types.find(ct => ct.docType === t);
        return sum + (match ? match.count : 0);
      }, 0),
      critical: s.critical,
    };
  });

  const gaps = sections.filter(s => {
    const found = s.requiredTypes.every(t => types.some(ct => ct.docType === t && ct.count > 0));
    return !found;
  }).map(s => ({
    section: s.name,
    severity: s.critical ? 'critical' as const : 'warning' as const,
    message: s.critical
      ? `Seção crítica "${s.name}" sem documentos classificados`
      : `Seção "${s.name}" sem documentos classificados`,
  }));

  const outdatedStmt = db.prepare(`
    SELECT COUNT(*) as c FROM files
    WHERE doc_type != 'outro'
    AND date(last_modified) < date('now', '-6 months')
  `);
  outdatedStmt.step();
  const outdatedCount = Number(outdatedStmt.getAsObject().c);
  outdatedStmt.free();

  const recentStmt = db.prepare(`
    SELECT COUNT(*) as c FROM files
    WHERE doc_type != 'outro'
    AND date(last_modified) >= date('now', '-1 months')
  `);
  recentStmt.step();
  const recentCount = Number(recentStmt.getAsObject().c);
  recentStmt.free();

  db.run('COMMIT');

  res.json({
    totalDocuments: total,
    classifiedCount: types.reduce((s, t) => s + (t.docType !== 'outro' ? t.count : 0), 0),
    classificationRate: total > 0 ? Math.round((types.reduce((s, t) => s + (t.docType !== 'outro' ? t.count : 0), 0) / total) * 100) : 0,
    coverage,
    sectionStatus,
    gaps,
    outdatedCount,
    recentCount,
    score: Math.round(
      (sectionStatus.filter(s => s.covered).length / sectionStatus.length) * 50 +
      (recentCount / Math.max(outdatedCount + recentCount, 1)) * 30 +
      (total > 0 ? (types.reduce((s, t) => s + (t.docType !== 'outro' ? t.count : 0), 0) / total) * 20 : 0)
    ),
  });
});

router.get('/api/plan/gaps', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  db.run('BEGIN TRANSACTION');
  const gaps: any[] = [];

  const missingTypes = ['protocolo_crise', 'porta_voz', 'calendario_agenda', 'fluxo_trabalho'];
  const types = getStatsByType();

  for (const requiredType of missingTypes) {
    const found = types.some(t => t.docType === requiredType && t.count > 0);
    if (!found) {
      gaps.push({
        type: 'missing',
        docType: requiredType,
        label: getDocTypeLabel(requiredType as any),
        severity: requiredType === 'protocolo_crise' || requiredType === 'porta_voz' ? 'critical' : 'warning',
      });
    }
  }

  const outdatedStmt = db.prepare(`
    SELECT f.id, f.name, f.doc_type, f.last_modified
    FROM files f
    WHERE f.doc_type IN ('protocolo_crise', 'fluxo_trabalho', 'normativa_diretriz')
    AND date(f.last_modified) < date('now', '-6 months')
    ORDER BY f.last_modified ASC
    LIMIT 10
  `);
  while (outdatedStmt.step()) {
    const row = outdatedStmt.getAsObject() as any;
    gaps.push({
      type: 'outdated',
      docType: String(row.doc_type),
      fileId: Number(row.id),
      name: String(row.name),
      lastModified: String(row.last_modified || ''),
      severity: 'warning',
    });
  }
  outdatedStmt.free();

  db.run('COMMIT');

  res.json({ gaps });
});

router.get('/api/plan/update-timeline', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  db.run('BEGIN TRANSACTION');
  const stmt = db.prepare(`
    SELECT strftime('%Y-%m', last_modified) as month,
           COUNT(*) as count,
           SUM(CASE WHEN doc_type != 'outro' THEN 1 ELSE 0 END) as classified
    FROM files
    WHERE last_modified IS NOT NULL
    GROUP BY month
    ORDER BY month DESC
    LIMIT 24
  `);

  const timeline: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    timeline.push({
      month: String(row.month),
      total: Number(row.count),
      classified: Number(row.classified || 0),
    });
  }
  stmt.free();

  db.run('COMMIT');

  res.json({ timeline });
});

export default router;
