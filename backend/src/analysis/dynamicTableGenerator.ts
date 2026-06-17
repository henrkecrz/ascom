import { getDatabase, scheduleSave } from '../database';
import { InferredSchema, InferredColumn } from './schemaInferrer';
import { logger } from '../lib/logger';

const SQLITE_TYPE_MAP: Record<string, string> = {
  TEXT: 'TEXT',
  INTEGER: 'INTEGER',
  REAL: 'REAL',
  DATE: 'TEXT',       // SQLite doesn't have DATE, store as TEXT ISO
  BOOLEAN: 'INTEGER', // 0/1
  JSON: 'TEXT',       // Store as JSON string
  CPF: 'TEXT',
  CNPJ: 'TEXT',
  CEP: 'TEXT',
  PHONE: 'TEXT',
  EMAIL: 'TEXT',
  URL: 'TEXT',
};

export interface TableInfo {
  tableName: string;
  exists: boolean;
  existingColumns: string[];
  missingColumns: InferredColumn[];
  created: boolean;
  altered: boolean;
}

/**
 * Check if a table exists in the database
 */
export function tableExists(tableName: string): boolean {
  const db = getDatabase();
  if (!db) return false;
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?");
  stmt.bind([tableName]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

/**
 * Get existing columns of a table
 */
export function getTableColumns(tableName: string): string[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  const columns: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    columns.push(String(row.name));
  }
  stmt.free();
  return columns;
}

/**
 * Create a new table from schema
 */
export function createTable(schema: InferredSchema): boolean {
  const db = getDatabase();
  if (!db) return false;

  const colDefs = schema.columns.map(col => {
    const sqlType = SQLITE_TYPE_MAP[col.type] || 'TEXT';
    const nullable = col.nullable ? '' : ' NOT NULL';
    const pk = col.isKey ? ' PRIMARY KEY' : '';
    return `"${col.name}" ${sqlType}${nullable}${pk}`;
  });

  // Always add metadata columns
  colDefs.push('"id" INTEGER PRIMARY KEY AUTOINCREMENT');
  colDefs.push('"source_file_id" INTEGER');
  colDefs.push('"imported_at" TEXT DEFAULT (datetime(\'now\'))');
  colDefs.push('"row_hash" TEXT UNIQUE');

  const sql = `CREATE TABLE IF NOT EXISTS "${schema.tableName}" (${colDefs.join(', ')})`;

  try {
    db.run(sql);
    // Create index on source_file_id for lookups
    db.run(`CREATE INDEX IF NOT EXISTS "idx_${schema.tableName}_source" ON "${schema.tableName}"(source_file_id)`);
    scheduleSave();
    logger.info(`Table created: ${schema.tableName}`, { columns: schema.columns.length });
    return true;
  } catch (err: any) {
    logger.error(`Failed to create table ${schema.tableName}`, { error: err.message });
    return false;
  }
}

/**
 * Add missing columns to an existing table
 */
export function addMissingColumns(tableName: string, columns: InferredColumn[]): string[] {
  const db = getDatabase();
  if (!db) return [];

  const added: string[] = [];
  for (const col of columns) {
    const sqlType = SQLITE_TYPE_MAP[col.type] || 'TEXT';
    try {
      db.run(`ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${sqlType}`);
      added.push(col.name);
    } catch (err: any) {
      // Column likely already exists
      logger.debug(`Column ${col.name} may already exist`, { error: err.message });
    }
  }
  if (added.length > 0) {
    scheduleSave();
    logger.info(`Added columns to ${tableName}`, { columns: added });
  }
  return added;
}

/**
 * Ensure a table exists matching the schema.
 * Returns info about what was done.
 */
export function ensureTable(schema: InferredSchema): TableInfo {
  const exists = tableExists(schema.tableName);
  const existingColumns = exists ? getTableColumns(schema.tableName) : [];
  
  // Filter out metadata columns that already exist
  const metadataCols = new Set(['id', 'source_file_id', 'imported_at', 'row_hash']);
  const userColumns = schema.columns.filter(c => !metadataCols.has(c.name));
  
  const missingColumns = exists
    ? userColumns.filter(c => !existingColumns.includes(c.name))
    : userColumns;

  let created = false;
  let altered = false;

  if (!exists) {
    created = createTable(schema);
  } else if (missingColumns.length > 0) {
    const added = addMissingColumns(schema.tableName, missingColumns);
    altered = added.length > 0;
  }

  return {
    tableName: schema.tableName,
    exists,
    existingColumns,
    missingColumns,
    created,
    altered,
  };
}

/**
 * Insert data rows into a table
 */
export function insertData(tableName: string, columns: InferredColumn[], rows: any[][]): number {
  const db = getDatabase();
  if (!db) return 0;

  const colNames = columns.map(c => `"${c.name}"`);
  const placeholders = columns.map(() => '?').join(', ');
  // Handle row_hash column if it exists or if we're creating it
  const sql = `INSERT OR IGNORE INTO "${tableName}" (${colNames.join(', ')}, "row_hash") VALUES (${placeholders}, ?)`;

  let inserted = 0;
  const batchSize = 50;
  const crypto = require('crypto');

  try {
    db.run('BEGIN TRANSACTION');
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      for (const row of batch) {
        try {
          const hash = crypto.createHash('md5').update(JSON.stringify(row)).digest('hex');
          db.run(sql, [...row, hash]);
          // Check if changes were made (meaning it wasn't ignored)
          const changesStmt = db.prepare('SELECT changes() as c');
          changesStmt.step();
          const changes = Number(changesStmt.getAsObject().c);
          changesStmt.free();
          if (changes > 0) inserted++;
        } catch (err: any) {
          logger.warn(`Failed to insert row in ${tableName}`, { error: err.message });
        }
      }
    }
    db.run('COMMIT');
    scheduleSave();
  } catch (err: any) {
    db.run('ROLLBACK');
    logger.error(`Batch insert failed for ${tableName}`, { error: err.message });
  }

  return inserted;
}

/**
 * Get all dynamic (user-created) tables
 */
export function getDynamicTables(): { tableName: string; rowCount: number; columns: string[] }[] {
  const db = getDatabase();
  if (!db) return [];

  // System tables to exclude
  const systemTables = new Set([
    'files', 'document_text', 'document_summary', 'document_relations',
    'document_clusters', 'structured_data', 'document_sections',
    'knowledge_relations', 'classification_feedback', 'contacts',
    'settings', 'photo_events', 'photos', 'photo_document_links',
    'data_sources', 'processing_queue', 'sqlite_sequence',
  ]);

  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const tables: { tableName: string; rowCount: number; columns: string[] }[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    const name = String(row.name);
    if (systemTables.has(name)) continue;

    const colStmt = db.prepare(`PRAGMA table_info("${name}")`);
    const cols: string[] = [];
    while (colStmt.step()) {
      const colRow = colStmt.getAsObject() as any;
      cols.push(String(colRow.name));
    }
    colStmt.free();

    const countStmt = db.prepare(`SELECT COUNT(*) as c FROM "${name}"`);
    countStmt.step();
    const count = Number(countStmt.getAsObject().c);
    countStmt.free();

    tables.push({ tableName: name, rowCount: count, columns: cols });
  }
  stmt.free();

  return tables;
}
