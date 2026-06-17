import path from 'path';
import fs from 'fs';
import { inferSchema, InferredSchema, inferColumnType } from './schemaInferrer';
import { ensureTable, insertData, getDynamicTables, TableInfo } from './dynamicTableGenerator';
import { generateSchemaHash, getCachedSchema, cacheSchema } from './schemaCache';
import { findAllRelationships, validateRelationship, Relationship } from './relationshipFinder';
import { extractText } from '../processors/textExtractor';
import * as XLSX from 'xlsx';
import { getDatabase, insertImportHistory } from '../database';
import { logger } from '../lib/logger';
import { extractTableFromFile } from '../processors/tableExtractor';

export interface ImportPreview {
  fileId: number;
  fileName: string;
  filePath: string;
  extension: string;
  schema: InferredSchema;
  tableInfo: TableInfo;
  rowCount: number;
  sampleRows: any[][];
  issues: string[];
}

export interface ImportResult {
  success: boolean;
  tableName: string;
  rowsInserted: number;
  relationships: Relationship[];
  error?: string;
}

// Store import jobs in memory (for status tracking)
const importJobs = new Map<string, { status: 'pending' | 'processing' | 'done' | 'error'; result?: ImportResult; error?: string }>();

function generateJobId(): string {
  return `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}



/**
 * Preview what would be imported from a file
 */
export async function previewFileImport(filePath: string, fileId: number, fileText?: string): Promise<ImportPreview[]> {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  // Read structured data via Universal Table Extractor
  const tables = await extractTableFromFile(filePath, ext);
  const previews: ImportPreview[] = [];
  
  // Get full text for AI analysis
  let fullText = fileText || '';
  if (!fullText && (ext === '.docx' || ext === '.pdf' || ext === '.doc' || ext === '.pptx')) {
    try {
      fullText = await extractText(filePath, ext);
    } catch {}
  }
  
  for (const table of tables) {
    const displayRows = table.headers.length > 0 ? table.rows : [];
    const displayHeaders = table.headers;
    
    // Sample data for AI (first 5 rows mapped to headers)
    const sampleData = displayRows.slice(0, 5).map(row => {
      const obj: Record<string, string> = {};
      displayHeaders.forEach((h, i) => { obj[h] = String(row[i] || ''); });
      return obj;
    });

    // Check cache first
    const hash = generateSchemaHash(displayHeaders, ext);
    let schema = getCachedSchema(hash);

    if (!schema) {
      // Infer schema using AI + heuristics
      schema = await inferSchema(`${fileName} - ${table.name}`, sampleData, ext, fullText);
      if (schema.confidence > 0.6) {
        cacheSchema(hash, schema);
      }
    }

    // If we have headers from the file, use them instead of AI-inferred
    if (displayHeaders.length > 0 && schema.columns.length === 0) {
      schema.columns = displayHeaders.map(h => ({
        name: h,
        type: inferColumnType(displayRows.map(r => String(r[displayHeaders.indexOf(h)] || '')).filter(Boolean)),
        description: '',
        nullable: true,
        isKey: false,
        sampleValues: displayRows.slice(0, 3).map(r => String(r[displayHeaders.indexOf(h)] || '')),
      }));
    }

    // Check table status
    const tableInfo = ensureTable(schema);

    // Identify potential issues
    const issues: string[] = [];
    if (schema.confidence < 0.5) issues.push('Baixa confiança na classificação');
    if (displayRows.length === 0 && ext.match(/\.(xlsx|xls|csv|tsv)$/i)) issues.push('Tabela parece vazia ou sem dados');
    if (schema.columns.length === 0) issues.push('Nenhuma coluna detectada');

    previews.push({
      fileId,
      fileName: tables.length > 1 ? `${fileName} (${table.name})` : fileName,
      filePath,
      extension: ext,
      schema,
      tableInfo,
      rowCount: displayRows.length,
      sampleRows: displayRows.slice(0, 5),
      issues,
    });
  }

  return previews;
}

function inferBasicType(values: string[]): 'TEXT' | 'INTEGER' | 'REAL' | 'DATE' | 'BOOLEAN' {
  if (values.length === 0) return 'TEXT';
  const nonEmpty = values.filter(v => v && v !== '');
  if (nonEmpty.length === 0) return 'TEXT';

  // Check BOOLEAN
  if (nonEmpty.every(v => /^(true|false|sim|não|nao|0|1)$/i.test(v.trim()))) return 'BOOLEAN';

  // Check INTEGER
  if (nonEmpty.every(v => /^-?\d+$/.test(v.trim()))) return 'INTEGER';

  // Check REAL
  if (nonEmpty.every(v => /^-?\d+[,.]?\d*$/.test(v.trim().replace(/[R$]/g, '')))) return 'REAL';

  // Check DATE
  const datePatterns = [/^\d{4}-\d{2}-\d{2}/, /^\d{2}\/\d{2}\/\d{4}/, /^\d{2}[.]\d{2}[.]\d{4}/];
  if (nonEmpty.every(v => datePatterns.some(p => p.test(v.trim())))) return 'DATE';

  return 'TEXT';
}

/**
 * Execute the import for a file
 */
export async function importFile(
  filePath: string,
  fileId: number,
  sourceId: number,
  customSchema?: InferredSchema
): Promise<ImportResult> {
  const jobId = generateJobId();
  importJobs.set(jobId, { status: 'processing' });

  try {
    // Read all rows via Universal Table Extractor
    const ext = path.extname(filePath).toLowerCase();
    const tables = await extractTableFromFile(filePath, ext);
    
    // Preview to get schema for all tables
    const previews = await previewFileImport(filePath, fileId);

    let totalInserted = 0;
    let finalTableName = '';
    let allRelationships: Relationship[] = [];

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const preview = previews[i];
      if (!preview) continue;

      const schema = customSchema || preview.schema;

      // Ensure table exists
      ensureTable(schema);

      const headers = table.headers;
      const rows = table.rows;

      if (headers.length > 0 && rows.length > 0) {
        // Map file rows to schema columns
        const columnMap = schema.columns.map((col: any) => {
          const idx = headers.findIndex((h: string) => h.toLowerCase() === col.name.toLowerCase());
          return idx >= 0 ? idx : -1;
        });

        // Transform rows: only keep mapped columns, add source_file_id
        const mappedRows = rows.map((row: any[]) => {
          return schema.columns.map((col: any, ci: number) => {
            if (col.name === 'source_file_id') return sourceId;
            if (col.name === 'imported_at') return new Date().toISOString();
            const srcIdx = columnMap[ci];
            return srcIdx >= 0 ? String(row[srcIdx] || '') : '';
          });
        });

        // Insert into table
        const inserted = insertData(schema.tableName, schema.columns, mappedRows);

        // Find relationships
        const relationships = findAllRelationships().filter(r =>
          r.sourceTable === schema.tableName || r.targetTable === schema.tableName
        );

        if (inserted > 0) {
          insertImportHistory({
            source_id: sourceId,
            file_id: fileId,
            table_name: schema.tableName,
            rows_inserted: inserted
          });
        }

        // Validate the most promising relationships
        const validatedRelationships = relationships
          .map(r => {
            const result = validateRelationship(r);
            return { ...r, confidence: result.overlapRatio, valid: result.valid };
          })
          .filter(r => r.valid);

        totalInserted += inserted;
        finalTableName = schema.tableName;
        allRelationships.push(...validatedRelationships);
      }
    }

    if (totalInserted > 0) {
      const result: ImportResult = {
        success: true,
        tableName: finalTableName,
        rowsInserted: totalInserted,
        relationships: allRelationships,
      };

      importJobs.set(jobId, { status: 'done', result });
      return result;
    }

    const result: ImportResult = {
      success: false,
      tableName: '',
      rowsInserted: 0,
      relationships: [],
      error: 'Nenhum dado tabular encontrado',
    };

    importJobs.set(jobId, { status: 'done', result });
    return result;
  } catch (err: any) {
    const error = err.message || 'Erro desconhecido na importação';
    importJobs.set(jobId, { status: 'error', error });
    logger.error('Import failed', { filePath, error });
    return { success: false, tableName: '', rowsInserted: 0, relationships: [], error };
  }
}

/**
 * Get import job status
 */
export function getImportStatus(jobId: string): { status: string; result?: ImportResult; error?: string } | null {
  return importJobs.get(jobId) || null;
}

/**
 * Preview all importable files in a data source
 */
function collectImportableFiles(dirPath: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectImportableFiles(fullPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.xlsx', '.xls', '.csv', '.tsv', '.docx', '.pdf'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

export async function previewDataSource(sourcePath: string, label: string): Promise<ImportPreview[]> {
  const results: ImportPreview[] = [];

  if (!fs.existsSync(sourcePath)) return results;

  const importableFiles = collectImportableFiles(sourcePath);
  let fileCounter = 0;

  for (const fullPath of importableFiles) {
    fileCounter++;
    try {
      const preview = await previewFileImport(fullPath, fileCounter);
      results.push(...preview);
    } catch (err: any) {
      logger.warn(`Failed to preview ${path.basename(fullPath)}`, { error: err.message });
    }
  }

  return results;
}

export { getDynamicTables } from './dynamicTableGenerator';
export type { InferredSchema, InferredColumn } from './schemaInferrer';
