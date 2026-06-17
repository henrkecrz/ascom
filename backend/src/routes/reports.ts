import { Router, Request, Response } from 'express';
import { getDatabase, getClusters } from '../database';

const router = Router();

function mapDocRow(row: any) {
  return {
    id: Number(row.id),
    name: String(row.name),
    extension: row.extension,
    size_formatted: String(row.size_formatted),
    category: String(row.category),
    parent_folder: String(row.parent_folder),
    summary: String(row.summary || ''),
    keywords: row.keywords ? String(row.keywords).split(',').map((k: string) => k.trim()).filter(Boolean) : [],
    topics: row.topics ? String(row.topics).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    word_count: Number(row.word_count || 0),
  }
}

function executeBatchQuery(db: any, ids: number[]): Map<number, any> {
  const docMap = new Map<number, any>();
  if (ids.length === 0) return docMap;
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.size_formatted, f.category, f.parent_folder,
           ds.summary, ds.keywords, ds.topics, ds.word_count
    FROM files f
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    WHERE f.id IN (${placeholders})
  `);
  stmt.bind(ids);
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    docMap.set(Number(row.id), mapDocRow(row));
  }
  stmt.free();
  return docMap;
}

function computeTopKeywords(docs: any[], max: number = 20) {
  const kwMap = new Map<string, number>();
  for (const doc of docs) {
    for (const kw of doc.keywords) {
      kwMap.set(kw, (kwMap.get(kw) || 0) + 1);
    }
  }
  return [...kwMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word, count]) => ({ word, count }));
}

function computeStats(docs: any[]) {
  const totalWords = docs.reduce((s, d) => s + d.word_count, 0);
  return {
    total_documents: docs.length,
    total_words: totalWords,
    avg_words: docs.length > 0 ? Math.round(totalWords / docs.length) : 0,
  };
}

router.get('/api/reports', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const clusters = getClusters();
  const allIds = new Set<number>();
  clusters.forEach((c: any) => String(c.file_ids).split(',').map(Number).forEach((id: number) => allIds.add(id)));

  const docMap = executeBatchQuery(db, [...allIds]);

  const idArr = [...allIds];
  const placeholders = idArr.map(() => '?').join(',');
  const relationStmt = db.prepare(`
    SELECT file_id_1, file_id_2, similarity_score
    FROM document_relations
    WHERE similarity_score > 0.05
      AND (file_id_1 IN (${placeholders}) OR file_id_2 IN (${placeholders}))
    ORDER BY similarity_score DESC
  `);
  relationStmt.bind([...idArr, ...idArr]);
  const relations: { f1: number; f2: number }[] = [];
  while (relationStmt.step()) {
    const row = relationStmt.getAsObject() as any;
    relations.push({ f1: Number(row.file_id_1), f2: Number(row.file_id_2) });
  }
  relationStmt.free();

  const reports = clusters.map((cluster: any) => {
    const ids = String(cluster.file_ids).split(',').map(Number);
    const idSet = new Set(ids);
    const docs = ids.map((id: number) => docMap.get(id)).filter(Boolean);
    const strongConnections = relations.filter(r => idSet.has(r.f1) && idSet.has(r.f2)).length;

    return {
      clusterId: Number(cluster.id),
      clusterName: String(cluster.name),
      description: String(cluster.description),
      themeWords: String(cluster.theme_words).split(',').filter(Boolean),
      documents: docs.sort((a: any, b: any) => b.word_count - a.word_count),
      stats: computeStats(docs),
      topKeywords: computeTopKeywords(docs, 20),
      strongConnections,
      printable: true,
    };
  });

  res.json({
    generatedAt: new Date().toISOString(),
    totalClusters: reports.length,
    reports,
  });
});

router.get('/api/reports/:clusterId', (req: Request, res: Response) => {
  const clusterId = parseInt(req.params.clusterId as string, 10);
  if (isNaN(clusterId)) return res.status(400).json({ error: 'ID inválido' });

  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const clusterStmt = db.prepare('SELECT * FROM document_clusters WHERE id = ?');
  clusterStmt.bind([clusterId]);
  if (!clusterStmt.step()) {
    clusterStmt.free();
    return res.status(404).json({ error: 'Cluster não encontrado' });
  }
  const cluster = clusterStmt.getAsObject() as any;
  clusterStmt.free();

  const ids = String(cluster.file_ids).split(',').map(Number);
  const docMap = new Map<number, any>();
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT f.id, f.name, f.extension, f.size_formatted, f.category, f.parent_folder, f.last_modified,
             ds.summary, ds.keywords, ds.topics, ds.word_count
      FROM files f
      LEFT JOIN document_summary ds ON ds.file_id = f.id
      WHERE f.id IN (${placeholders})
    `);
    stmt.bind(ids);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      docMap.set(Number(row.id), {
        id: Number(row.id),
        name: String(row.name),
        extension: row.extension,
        size_formatted: String(row.size_formatted),
        category: String(row.category),
        parent_folder: String(row.parent_folder),
        last_modified: String(row.last_modified || ''),
        summary: String(row.summary || ''),
        keywords: row.keywords ? String(row.keywords).split(',').map((k: string) => k.trim()).filter(Boolean) : [],
        topics: row.topics ? String(row.topics).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        word_count: Number(row.word_count || 0),
      });
    }
    stmt.free();
  }

  const docs: any[] = ids.map((id: number) => docMap.get(id)).filter(Boolean);

  const allKeywords = new Map<string, number>();
  for (const doc of docs) {
    for (const kw of doc.keywords) {
      allKeywords.set(kw, (allKeywords.get(kw) || 0) + 1);
    }
  }

  const topKeywords = [...allKeywords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([w, c]) => ({ word: w, count: c }));

  const totalWords = docs.reduce((s, d) => s + d.word_count, 0);

  const html = generatePrintableReport({
    name: String(cluster.name),
    description: String(cluster.description || ''),
    themeWords: String(cluster.theme_words || '').split(',').filter(Boolean),
    documents: docs,
    topKeywords,
    stats: {
      total_documents: docs.length,
      total_words: totalWords,
      avg_words: docs.length > 0 ? Math.round(totalWords / docs.length) : 0,
    },
    generatedAt: new Date().toISOString(),
  });

  res.json({
    clusterId: Number(cluster.id),
    name: String(cluster.name),
    description: String(cluster.description || ''),
    themeWords: String(cluster.theme_words || '').split(',').filter(Boolean),
    documents: docs.sort((a, b) => b.word_count - a.word_count),
    topKeywords,
    stats: {
      total_documents: docs.length,
      total_words: totalWords,
      avg_words: docs.length > 0 ? Math.round(totalWords / docs.length) : 0,
    },
    html,
  });
});

function generatePrintableReport(data: any): string {
  const date = new Date(data.generatedAt);
  const dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');

  let docRows = data.documents.map((d: any, i: number) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px">${d.name}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px">${d.extension || '-'}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px">${d.word_count}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px">${d.summary ? d.summary.substring(0, 120) + '...' : '-'}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px">${d.keywords.slice(0, 5).join(', ')}</td>
    </tr>
  `).join('');

  let kwSpans = data.topKeywords.map((kw: any) =>
    `<span style="display:inline-block;background:#e8eaf6;color:#1a237e;padding:2px 8px;margin:2px;border-radius:4px;font-size:11px">${kw.word} (${kw.count})</span>`
  ).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Executivo - ${data.name}</title>
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
    td { padding: 6px 8px; border: 1px solid #ddd; font-size: 12px; }
    tr:nth-child(even) { background: #f9f9f9; }
    .keywords { margin: 10px 0; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; }
    .theme-words { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 15px; }
    .theme-word { background: #1a237e; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Relatório Executivo</h1>
    <h2 style="margin:5px 0;font-size:18px;color:#333">${data.name}</h2>
    <p>${data.description}</p>
    <p>Gerado em: ${dateStr}</p>
  </div>

  <div class="section">
    <h2>📊 Estatísticas</h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="value">${data.stats.total_documents}</div><div class="label">Documentos</div></div>
      <div class="stat-card"><div class="value">${data.stats.total_words.toLocaleString()}</div><div class="label">Total de Palavras</div></div>
      <div class="stat-card"><div class="value">${data.stats.avg_words.toLocaleString()}</div><div class="label">Média p/ Documento</div></div>
    </div>
  </div>

  <div class="section">
    <h2>🏷️ Palavras-tema do Cluster</h2>
    <div class="theme-words">${data.themeWords.map((w: string) => `<span class="theme-word">${w.trim()}</span>`).join('')}</div>
  </div>

  <div class="section">
    <h2>🔑 Palavras-chave Principais</h2>
    <div class="keywords">${kwSpans}</div>
  </div>

  <div class="section">
    <h2>📄 Documentos do Cluster</h2>
    <table>
      <thead><tr><th>#</th><th>Nome</th><th>Tipo</th><th>Palavras</th><th>Resumo</th><th>Keywords</th></tr></thead>
      <tbody>${docRows}</tbody>
    </table>
  </div>

  <div class="footer">
    Relatório gerado automaticamente pelo Sistema Plano de Comunicação - Novacap ASCOM
  </div>
</body>
</html>`;
}

export default router;
