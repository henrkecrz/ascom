import { Router, Request, Response } from 'express';
import { getDatabase } from '../database';

const router = Router();

function parseDateFromText(text: string): { year?: number; month?: number; day?: number } | null {
  const patterns = [
    /(\d{2})[./](\d{2})[./](\d{4})/,
    /(\d{4})[./-](\d{2})[./-](\d{2})/,
    /(\d{2})\s+de\s+([a-záéíóúâêîôûãõç]+)\s+de\s+(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const monthMap: Record<string, number> = {
        janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5,
        junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
      };

      if (match[4]) {
        const month = monthMap[match[2].toLowerCase()];
        if (month) return { year: parseInt(match[3]), month, day: parseInt(match[1]) };
      }

      if (match[3] && parseInt(match[3]) > 1900) {
        return {
          day: parseInt(match[1] || '0'),
          month: parseInt(match[2] || '0'),
          year: parseInt(match[3]),
        };
      }
    }
  }

  return null;
}

router.get('/api/timeline', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const timelinePoints: any[] = [];

  const stmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.size_formatted, f.category, f.last_modified,
           f.parent_folder, dt.raw_text, ds.summary, ds.topics
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id AND dt.status = 'done'
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    ORDER BY f.last_modified DESC
  `);

  const yearBuckets: Record<number, any[]> = {};
  const decadeBuckets: Record<string, any[]> = {};

  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    const rawText = String(row.raw_text || '');
    const lastModified = String(row.last_modified || '');

    let docDate: Date | null = null;
    let dateLabel = '';
    let year = 0;
    let month = 0;

    if (lastModified) {
      docDate = new Date(lastModified);
      if (!isNaN(docDate.getTime())) {
        year = docDate.getFullYear();
        month = docDate.getMonth() + 1;
        dateLabel = docDate.toLocaleDateString('pt-BR');
      }
    }

    const textDate = rawText.length > 50 ? parseDateFromText(rawText) : null;
    if (textDate && textDate.year && (!year || textDate.year < year)) {
      year = textDate.year;
      month = textDate.month || 0;
      if (textDate.day && textDate.month) {
        const d = new Date(textDate.year, textDate.month - 1, textDate.day);
        if (!isNaN(d.getTime())) docDate = d;
      }
      dateLabel = textDate.month && textDate.day
        ? `${textDate.day.toString().padStart(2, '0')}/${textDate.month.toString().padStart(2, '0')}/${textDate.year}`
        : `${textDate.year}`;
    }

    const doc = {
      id: Number(row.id),
      name: String(row.name),
      extension: row.extension,
      size_formatted: String(row.size_formatted),
      category: String(row.category),
      parent_folder: String(row.parent_folder),
      summary: String(row.summary || ''),
      topics: String(row.topics || ''),
      date: dateLabel,
      year,
      month,
      source: lastModified && docDate && !isNaN(docDate.getTime()) ? 'modified' : 'content',
    };

    timelinePoints.push(doc);

    if (year > 0) {
      if (!yearBuckets[year]) yearBuckets[year] = [];
      yearBuckets[year].push(doc);
    }

    const decadeKey = year > 0 ? `${Math.floor(year / 5) * 5}-${Math.floor(year / 5) * 5 + 4}` : 'Sem data';
    if (!decadeBuckets[decadeKey]) decadeBuckets[decadeKey] = [];
    decadeBuckets[decadeKey].push(doc);
  }
  stmt.free();

  const years = Object.keys(yearBuckets)
    .map(Number)
    .filter(y => y >= 2000 && y <= 2030)
    .sort((a, b) => b - a);

  const yearData = years.map(y => ({
    year: y,
    count: yearBuckets[y].length,
    documents: yearBuckets[y].slice(0, 20),
  }));

  const hasTextStmt = db.prepare("SELECT COUNT(*) as c FROM document_text WHERE status = 'done'");
  hasTextStmt.step();
  const totalExtracted = Number(hasTextStmt.getAsObject().c);
  hasTextStmt.free();

  res.json({
    timeline: timelinePoints,
    years: yearData,
    total: timelinePoints.length,
    totalExtracted,
    dateRange: {
      min: years.length > 0 ? Math.min(...years) : 0,
      max: years.length > 0 ? Math.max(...years) : 0,
    },
  });
});

router.get('/api/timeline/year/:year', (req: Request, res: Response) => {
  const year = parseInt(req.params.year as string, 10);
  if (isNaN(year)) return res.status(400).json({ error: 'Ano inválido' });

  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const stmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.size_formatted, f.category, f.last_modified,
           f.parent_folder, dts.summary, dts.keywords, dts.topics, dts.word_count
    FROM files f
    LEFT JOIN document_summary dts ON dts.file_id = f.id
    ORDER BY f.last_modified DESC
  `);

  const docs: any[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    const lm = String(row.last_modified || '');
    if (lm) {
      const d = new Date(lm);
      if (!isNaN(d.getTime()) && d.getFullYear() === year) {
        docs.push({
          id: Number(row.id),
          name: String(row.name),
          extension: row.extension,
          size_formatted: String(row.size_formatted),
          category: String(row.category),
          parent_folder: String(row.parent_folder),
          summary: String(row.summary || ''),
          keywords: String(row.keywords || ''),
          topics: String(row.topics || ''),
          date: d.toLocaleDateString('pt-BR'),
          month: d.getMonth() + 1,
        });
      }
    }
  }
  stmt.free();

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const byMonth = monthNames.map((name, i) => ({
    month: i + 1,
    name,
    documents: docs.filter(d => d.month === i + 1),
  })).filter(m => m.documents.length > 0);

  res.json({ year, total: docs.length, months: byMonth, documents: docs });
});

export default router;
