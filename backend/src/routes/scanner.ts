import { Router, Request, Response } from 'express';
import { getDatabase } from '../database';

const router = Router();

router.get('/api/scanner/stats', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    if (!db) return res.status(503).json({ error: 'Banco não inicializado' });

    const stmt = db.prepare(`
      SELECT sl.*, ds.last_scanned
      FROM scan_log sl
      LEFT JOIN data_sources ds ON ds.id = sl.source_id
      ORDER BY sl.scanned_at DESC
      LIMIT 200
    `);
    const logs: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      logs.push({
        id: Number(row.id),
        source_id: Number(row.source_id),
        source_label: String(row.source_label),
        source_path: String(row.source_path),
        new_count: Number(row.new_count),
        modified_count: Number(row.modified_count),
        removed_count: Number(row.removed_count),
        total_files: Number(row.total_files),
        total_size_bytes: Number(row.total_size_bytes),
        online: Number(row.online) === 1,
        scanned_at: String(row.scanned_at),
      });
    }
    stmt.free();

    const sourcesStmt = db.prepare(`
      SELECT ds.id, ds.label, ds.path, ds.type, ds.active, ds.last_scanned,
             COUNT(f.id) as file_count,
             COALESCE(SUM(f.size_bytes), 0) as total_bytes
      FROM data_sources ds
      LEFT JOIN files f ON f.source_id = ds.id
      GROUP BY ds.id
      ORDER BY ds.label
    `);
    const sources: any[] = [];
    while (sourcesStmt.step()) {
      const row = sourcesStmt.getAsObject() as any;
      sources.push({
        id: Number(row.id),
        label: String(row.label),
        path: String(row.path),
        type: String(row.type),
        active: Number(row.active) === 1,
        last_scanned: row.last_scanned ? String(row.last_scanned) : null,
        file_count: Number(row.file_count),
        total_bytes: Number(row.total_bytes),
      });
    }
    sourcesStmt.free();

    const lastStmt = db.prepare('SELECT scanned_at FROM scan_log ORDER BY scanned_at DESC LIMIT 1');
    let lastScan: string | null = null;
    if (lastStmt.step()) {
      lastScan = String(lastStmt.getAsObject().scanned_at);
    }
    lastStmt.free();

    res.json({ logs, sources, lastScan });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao carregar estatísticas do scanner' });
  }
});

router.post('/api/scanner/trigger', async (_req: Request, res: Response) => {
  try {
    const { runScan } = require('../scanner');
    await runScan();
    res.json({ ok: true, message: 'Scan executado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao executar scan' });
  }
});

export default router;
