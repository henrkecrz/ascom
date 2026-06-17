import { Router, Request, Response } from 'express';
import { getDatabase, scheduleSave } from '../database';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/calendar/heatmap?year=2026
 * Returns heatmap data: document density by day + month totals + check status
 */
router.get('/api/calendar/heatmap', (req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Get documents grouped by month and day from last_modified
  const stmt = db.prepare(`
    SELECT 
      CAST(strftime('%m', last_modified) AS INTEGER) as month,
      CAST(strftime('%d', last_modified) AS INTEGER) as day,
      COUNT(*) as count,
      SUM(CASE WHEN dt.status = 'done' THEN 1 ELSE 0 END) as extracted
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    WHERE last_modified LIKE ?
    GROUP BY month, day
    ORDER BY month, day
  `);
  stmt.bind([`${year}%`]);

  const dayMap: Record<string, { month: number; day: number; count: number; extracted: number }> = {};
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    const key = `${row.month}-${row.day}`;
    dayMap[key] = {
      month: Number(row.month),
      day: Number(row.day),
      count: Number(row.count),
      extracted: Number(row.extracted),
    };
  }
  stmt.free();

  // Get monthly totals
  const monthStmt = db.prepare(`
    SELECT CAST(strftime('%m', last_modified) AS INTEGER) as month, COUNT(*) as total,
           SUM(CASE WHEN dt.status = 'done' THEN 1 ELSE 0 END) as processed
    FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    WHERE last_modified LIKE ?
    GROUP BY month
    ORDER BY month
  `);
  monthStmt.bind([`${year}%`]);

  const monthlyData: { month: number; name: string; total: number; processed: number; density: number }[] = [];
  while (monthStmt.step()) {
    const row = monthStmt.getAsObject() as any;
    const m = Number(row.month);
    monthlyData.push({
      month: m,
      name: months[m - 1] || `Mês ${m}`,
      total: Number(row.total),
      processed: Number(row.processed),
      density: 0, // calculated below
    });
  }
  monthStmt.free();

  // Calculate density (0-1) per month
  const maxTotal = Math.max(...monthlyData.map(m => m.total), 1);
  for (const m of monthlyData) {
    m.density = m.total / maxTotal;
  }

  // Get checked days
  const checkStmt = db.prepare(`
    SELECT check_date, year, month, day, documents_count, docs_analyzed, completed_at
    FROM calendar_checks
    WHERE year = ?
    ORDER BY month, day
  `);
  checkStmt.bind([year]);
  const checkedDays: Record<string, { checked: boolean; completed_at: string; docs_analyzed: number }> = {};
  while (checkStmt.step()) {
    const row = checkStmt.getAsObject() as any;
    const key = `${row.month}-${row.day}`;
    checkedDays[key] = {
      checked: true,
      completed_at: String(row.completed_at || ''),
      docs_analyzed: Number(row.docs_analyzed),
    };
  }
  checkStmt.free();

  // Build daily detail array
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) daysInMonth[2] = 29;

  const dailyData: {
    month: number; day: number; count: number; extracted: number;
    checked: boolean; completed_at: string | null; docs_analyzed: number;
  }[] = [];

  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= daysInMonth[m]; d++) {
      const key = `${m}-${d}`;
      const dayInfo = dayMap[key];
      const checked = checkedDays[key];
      dailyData.push({
        month: m,
        day: d,
        count: dayInfo?.count || 0,
        extracted: dayInfo?.extracted || 0,
        checked: !!checked,
        completed_at: checked?.completed_at || null,
        docs_analyzed: checked?.docs_analyzed || 0,
      });
    }
  }

  // Compute KPIs
  const allDays = dailyData.filter(d => d.count > 0);
  const checkedCount = allDays.filter(d => d.checked).length;
  const totalDays = allDays.length;
  const totalDocs = allDays.reduce((s, d) => s + d.count, 0);
  const totalExtracted = allDays.reduce((s, d) => s + d.extracted, 0);
  const progress = totalDays > 0 ? Math.round((checkedCount / totalDays) * 100) : 0;

  // Sort months by total (descending) for prioritization
  const priorityMonths = [...monthlyData].sort((a, b) => b.total - a.total);

  // Count most loaded consecutive days
  const loadedDays = dailyData.filter(d => d.count > 5).length;

  res.json({
    year,
    months: monthlyData,
    daily: dailyData,
    checkedDays: checkedCount,
    totalDaysWithDocs: totalDays,
    totalDocuments: totalDocs,
    totalExtracted,
    progress,
    priorityMonths: priorityMonths.map(m => m.name),
    topPriority: priorityMonths[0]?.name || 'Nenhum',
    highLoadDays: loadedDays,
  });
});

/**
 * PUT /api/calendar/check-day
 * Mark a specific day as checked/processed
 * Body: { date: "2026-03-15", docs_analyzed?: number, notes?: string }
 */
router.put('/api/calendar/check-day', (req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const { date, docs_analyzed, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'date é obrigatório (YYYY-MM-DD)' });

  const dateObj = new Date(date + 'T12:00:00');
  if (isNaN(dateObj.getTime())) return res.status(400).json({ error: 'Data inválida' });

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  // Count documents for this day
  const datePattern = date.replace(/-/g, '-');
  const docStmt = db.prepare(`
    SELECT COUNT(*) as count FROM files WHERE last_modified LIKE ?
  `);
  docStmt.bind([`${datePattern}%`]);
  docStmt.step();
  const docCount = Number(docStmt.getAsObject().count);
  docStmt.free();

  try {
    db.run(`
      INSERT OR REPLACE INTO calendar_checks (check_date, year, month, day, documents_count, docs_analyzed, notes, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [date, year, month, day, docCount, docs_analyzed || docCount, notes || '', new Date().toISOString()]);
    scheduleSave();
    res.json({ success: true, date, documents: docCount, docs_analyzed: docs_analyzed || docCount });
  } catch (err: any) {
    logger.error('Failed to check day', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/calendar/check-day
 * Uncheck a day
 * Body: { date: "2026-03-15" }
 */
router.delete('/api/calendar/check-day', (req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'date é obrigatório' });

  db.run('DELETE FROM calendar_checks WHERE check_date = ?', [date]);
  scheduleSave();
  res.json({ success: true });
});

/**
 * PUT /api/calendar/check-month
 * Bulk-mark all days with documents in a given month as checked.
 * Body: { year: 2026, month: 3 }
 */
router.put('/api/calendar/check-month', (req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const { year, month } = req.body;
  if (!year || !month) return res.status(400).json({ error: 'year e month são obrigatórios' });

  const monthPadded = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthPadded}`;

  try {
    // Find all days in this month that have documents
    const daysStmt = db.prepare(`
      SELECT 
        strftime('%Y-%m-%d', last_modified) as check_date,
        CAST(strftime('%d', last_modified) AS INTEGER) as day,
        COUNT(*) as count
      FROM files
      WHERE last_modified LIKE ?
      GROUP BY check_date
      ORDER BY day
    `);
    daysStmt.bind([`${datePrefix}%`]);

    const rows: { check_date: string; day: number; count: number }[] = [];
    while (daysStmt.step()) {
      const row = daysStmt.getAsObject() as any;
      rows.push({
        check_date: String(row.check_date),
        day: Number(row.day),
        count: Number(row.count),
      });
    }
    daysStmt.free();

    const now = new Date().toISOString();
    let inserted = 0;
    for (const row of rows) {
      db.run(`
        INSERT OR REPLACE INTO calendar_checks (check_date, year, month, day, documents_count, docs_analyzed, notes, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, '', ?)
      `, [row.check_date, year, month, row.day, row.count, row.count, now]);
      inserted++;
    }
    scheduleSave();

    logger.info(`Bulk check-month: ${inserted} days marked for ${datePrefix}`);
    res.json({ success: true, year, month, daysMarked: inserted });
  } catch (err: any) {
    logger.error('Failed to bulk check month', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/calendar/kpi
 * Return KPIs based on checked days and document progress
 */
router.get('/api/calendar/kpi', (req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.status(500).json({ error: 'Banco não inicializado' });

  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  // Total documents
  const totalStmt = db.prepare('SELECT COUNT(*) as c FROM files');
  totalStmt.step();
  const totalDocs = Number(totalStmt.getAsObject().c);
  totalStmt.free();

  // Documents with extracted text
  const extStmt = db.prepare("SELECT COUNT(*) as c FROM document_text WHERE status = 'done'");
  extStmt.step();
  const extracted = Number(extStmt.getAsObject().c);
  extStmt.free();

  // Documents with classification
  const classStmt = db.prepare("SELECT COUNT(*) as c FROM files WHERE doc_type != 'outro' AND doc_type IS NOT NULL");
  classStmt.step();
  const classified = Number(classStmt.getAsObject().c);
  classStmt.free();

  // Days checked this year
  const checkedStmt = db.prepare('SELECT COUNT(*) as c FROM calendar_checks WHERE year = ?');
  checkedStmt.bind([year]);
  checkedStmt.step();
  const daysChecked = Number(checkedStmt.getAsObject().c);
  checkedStmt.free();

  // Total days with documents this year
  const daysStmt = db.prepare(`
    SELECT COUNT(DISTINCT strftime('%Y-%m-%d', last_modified)) as c 
    FROM files WHERE last_modified LIKE ?
  `);
  daysStmt.bind([`${year}%`]);
  daysStmt.step();
  const totalDaysWithDocs = Number(daysStmt.getAsObject().c);
  daysStmt.free();

  // Documents processed per checked day (average)
  const docsPerDay = daysChecked > 0 ? Math.round(extracted / daysChecked) : 0;

  // Remaining unprocessed this year
  const remainingStmt = db.prepare(`
    SELECT COUNT(*) as c FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    WHERE dt.id IS NULL AND last_modified LIKE ?
  `);
  remainingStmt.bind([`${year}%`]);
  remainingStmt.step();
  const remaining = Number(remainingStmt.getAsObject().c);
  remainingStmt.free();

  // Estimated days to finish at current pace
  const estimatedDays = docsPerDay > 0 ? Math.ceil(remaining / docsPerDay) : remaining;

  // Top priority month
  const monthStmt = db.prepare(`
    SELECT CAST(strftime('%m', last_modified) AS INTEGER) as month, COUNT(*) as c
    FROM files WHERE last_modified LIKE ?
    GROUP BY month ORDER BY c DESC LIMIT 1
  `);
  monthStmt.bind([`${year}%`]);
  let topMonth = 'Nenhum';
  if (monthStmt.step()) {
    const row = monthStmt.getAsObject() as any;
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    topMonth = months[Number(row.month) - 1] || `Mês ${row.month}`;
  }
  monthStmt.free();

  res.json({
    totalDocuments: totalDocs,
    extracted,
    extractionRate: totalDocs > 0 ? Math.round((extracted / totalDocs) * 100) : 0,
    classified,
    classificationRate: totalDocs > 0 ? Math.round((classified / totalDocs) * 100) : 0,
    daysChecked,
    totalDaysWithDocs,
    daysProgress: totalDaysWithDocs > 0 ? Math.round((daysChecked / totalDaysWithDocs) * 100) : 0,
    avgDocsPerDay: docsPerDay,
    remaining,
    estimatedDaysToFinish: estimatedDays,
    topPriorityMonth: topMonth,
    year,
  });
});

export default router;
