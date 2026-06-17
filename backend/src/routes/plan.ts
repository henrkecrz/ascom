import { Router, Request, Response } from 'express';
import { getDatabase, getClusters, getCategories } from '../database';

const router = Router();

router.get('/api/plan', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const clusters = getClusters();
  const allIds = new Set<number>();
  clusters.forEach((c: any) => String(c.file_ids).split(',').map(Number).forEach((id: number) => allIds.add(id)));

  const docMap = new Map<number, any>();
  const idList = [...allIds];
  if (idList.length > 0) {
    const placeholders = idList.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT f.id, f.name, f.extension, f.size_formatted, f.category,
             ds.summary, ds.keywords, ds.word_count
      FROM files f
      LEFT JOIN document_summary ds ON ds.file_id = f.id
      WHERE f.id IN (${placeholders})
    `);
    stmt.bind(idList);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      docMap.set(Number(row.id), {
        id: Number(row.id),
        name: String(row.name),
        extension: row.extension,
        size_formatted: String(row.size_formatted),
        category: String(row.category),
        summary: row.summary || '',
        keywords: row.keywords || '',
        word_count: Number(row.word_count || 0),
      });
    }
    stmt.free();
  }

  const clustersWithDocs = clusters.map((cluster: any) => {
    const ids = String(cluster.file_ids).split(',').map(Number);
    const docs = ids.map((id: number) => docMap.get(id)).filter(Boolean);

    return {
      ...cluster,
      documents: docs.sort((a: any, b: any) => b.word_count - a.word_count),
    };
  });

  const statsStmt = db.prepare("SELECT COUNT(*) as count FROM document_summary WHERE word_count > 0");
  statsStmt.step();
  const withContent = Number(statsStmt.getAsObject().count);
  statsStmt.free();

  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM files');
  totalStmt.step();
  const total = Number(totalStmt.getAsObject().count);
  totalStmt.free();

  res.json({
    totalDocuments: total,
    documentsWithContent: withContent,
    clusters: clustersWithDocs,
    categories: getCategories(),
  });
});

export default router;
