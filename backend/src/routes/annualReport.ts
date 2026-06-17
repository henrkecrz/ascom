import { Router, Request, Response } from 'express';
import { getDatabase, getStatsByType, getDocumentsByType } from '../database';
import { getDocTypeLabel } from '../analysis/classifier';

const router = Router();

router.get('/api/reports/annual/:year', (req: Request, res: Response) => {
  const year = parseInt(req.params.year as string, 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ error: 'Ano inválido' });
  }

  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as c FROM files
    WHERE last_modified >= ? AND last_modified <= ?
  `);
  totalStmt.bind([yearStart, yearEnd]);
  totalStmt.step();
  const totalInYear = Number(totalStmt.getAsObject().c);
  totalStmt.free();

  const activeDocsStmt = db.prepare(`
    SELECT COUNT(*) as c FROM files
    WHERE doc_type != 'outro'
    AND last_modified >= ? AND last_modified <= ?
  `);
  activeDocsStmt.bind([yearStart, yearEnd]);
  activeDocsStmt.step();
  const classifiedInYear = Number(activeDocsStmt.getAsObject().c);
  activeDocsStmt.free();

  const types = getStatsByType();
  const typeBreakdown = types
    .filter(t => t.docType !== 'outro')
    .map(t => ({
      type: t.docType,
      label: getDocTypeLabel(t.docType as any),
      count: t.count,
    }));

  const crisisCount = types.find(t => t.docType === 'protocolo_crise')?.count || 0;
  const spokesCount = types.find(t => t.docType === 'porta_voz')?.count || 0;

  const monthlyStmt = db.prepare(`
    SELECT strftime('%m', last_modified) as month, COUNT(*) as count
    FROM files WHERE last_modified >= ? AND last_modified <= ?
    GROUP BY month ORDER BY month
  `);
  monthlyStmt.bind([yearStart, yearEnd]);
  const monthly: { month: number; count: number }[] = [];
  while (monthlyStmt.step()) {
    const row = monthlyStmt.getAsObject() as any;
    monthly.push({ month: Number(row.month), count: Number(row.count) });
  }
  monthlyStmt.free();

  const yearLabel = `${year}`;
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Anual de Atuação - ${year}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1a237e; }
    .header h1 { color: #1a237e; margin: 0 0 5px; font-size: 22px; }
    .header p { color: #666; margin: 2px 0; font-size: 13px; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #1a237e; font-size: 16px; border-left: 4px solid #1a237e; padding-left: 10px; margin: 0 0 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px; }
    .stat-card { background: #f5f5f5; padding: 12px; border-radius: 6px; text-align: center; }
    .stat-card .value { font-size: 24px; font-weight: 700; color: #1a237e; }
    .stat-card .label { font-size: 11px; color: #666; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1a237e; color: white; padding: 8px; text-align: left; font-size: 11px; }
    td { padding: 6px 8px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório Anual de Atuação</h1>
    <h2 style="margin:5px 0;font-size:18px;color:#333">${yearLabel}</h2>
    <p>Novacap ASCOM - Plano de Comunicação</p>
    <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
  </div>
  <div class="section">
    <h2>Indicadores Gerais</h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="value">${totalInYear}</div><div class="label">Documentos</div></div>
      <div class="stat-card"><div class="value">${classifiedInYear}</div><div class="label">Classificados</div></div>
      <div class="stat-card"><div class="value">${crisisCount}</div><div class="label">Protocolos de Crise</div></div>
      <div class="stat-card"><div class="value">${spokesCount}</div><div class="label">Porta-Vozes</div></div>
    </div>
  </div>
  <div class="section">
    <h2>Documentos por Tipo</h2>
    <table>
      <thead><tr><th>Tipo</th><th>Quantidade</th></tr></thead>
      <tbody>
        ${typeBreakdown.map(t => `<tr><td>${t.label}</td><td>${t.count}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="section">
    <h2>Atualizações Mensais</h2>
    <table>
      <thead><tr><th>Mês</th><th>Documentos</th></tr></thead>
      <tbody>
        ${monthly.map(m => `<tr><td>${m.month}/${year}</td><td>${m.count}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="footer">
    Relatório gerado automaticamente pelo Sistema Plano de Comunicação - Novacap ASCOM
  </div>
</body>
</html>`.trim();

  res.json({
    year,
    totalDocuments: totalInYear,
    classifiedDocuments: classifiedInYear,
    typeBreakdown,
    monthly,
    html,
  });
});

export default router;
