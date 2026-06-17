import { getDatabase, getCategories, getFileTypes } from '../database';

function getCount(db: any, sql: string): number {
  const stmt = db.prepare(sql);
  stmt.step();
  const val = Number(stmt.getAsObject().count);
  stmt.free();
  return val;
}

function getScalar(db: any, sql: string): number {
  const stmt = db.prepare(sql);
  stmt.step();
  const val = Number(stmt.getAsObject().total);
  stmt.free();
  return val;
}

export function getDashboardData() {
  const db = getDatabase();
  if (!db) throw new Error('Banco não inicializado');

  db.run('BEGIN TRANSACTION');
  try {
    const totalFiles = getCount(db, 'SELECT COUNT(*) as count FROM files');
    const totalSize = getScalar(db, "SELECT COALESCE(SUM(size_bytes), 0) as total FROM files");
    const extractedCount = getCount(db, "SELECT COUNT(*) as count FROM document_text WHERE status = 'done'");
    const clusterCount = getCount(db, 'SELECT COUNT(*) as count FROM document_clusters');
    const relationCount = getCount(db, 'SELECT COUNT(*) as count FROM document_relations');

    const recentStmt = db.prepare(`
      SELECT f.id, f.name, f.extension, f.size_formatted, f.category, f.last_modified,
             CASE WHEN dt.id IS NOT NULL THEN 1 ELSE 0 END as has_text
      FROM files f
      LEFT JOIN document_text dt ON dt.file_id = f.id
      ORDER BY f.last_modified DESC
      LIMIT 10
    `);
    const recent: any[] = [];
    while (recentStmt.step()) {
      const row = recentStmt.getAsObject() as any;
      recent.push({
        id: Number(row.id),
        name: String(row.name),
        extension: row.extension,
        size_formatted: String(row.size_formatted),
        category: String(row.category),
        last_modified: String(row.last_modified),
        has_text: Number(row.has_text) === 1,
      });
    }
    recentStmt.free();

    const sourceStmt = db.prepare(`
      SELECT ds.id, ds.label, ds.path, ds.type, ds.active, ds.last_scanned,
             COUNT(f.id) as file_count,
             COALESCE(SUM(f.size_bytes), 0) as total_bytes
      FROM data_sources ds
      LEFT JOIN files f ON f.source_id = ds.id
      GROUP BY ds.id
      ORDER BY ds.label
    `);
    const sources: any[] = [];
    while (sourceStmt.step()) {
      const row = sourceStmt.getAsObject() as any;
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
    sourceStmt.free();

    const lastScanStmt = db.prepare(`
      SELECT scanned_at,
             SUM(new_count) as new_count,
             SUM(modified_count) as modified_count,
             SUM(removed_count) as removed_count
      FROM scan_log
      WHERE scanned_at = (SELECT MAX(scanned_at) FROM scan_log)
      GROUP BY scanned_at
    `);
    let lastScan: { scanned_at: string; new_count: number; modified_count: number; removed_count: number } | null = null;
    if (lastScanStmt.step()) {
      const row = lastScanStmt.getAsObject() as any;
      lastScan = {
        scanned_at: String(row.scanned_at),
        new_count: Number(row.new_count),
        modified_count: Number(row.modified_count),
        removed_count: Number(row.removed_count),
      };
    }
    lastScanStmt.free();

    db.run('COMMIT');

    return {
      totalFiles,
      totalSize,
      extractedCount,
      clusterCount,
      relationCount,
      categories: getCategories(),
      fileTypes: getFileTypes(),
      recent,
      sources,
      lastScan,
    };
  } catch (err) {
    db.run('ROLLBACK');
    throw new Error('Erro ao carregar dashboard');
  }
}
