import { insertStructuredData, insertContact, insertKnowledgeRelation, getDatabase, insertCluster } from '../database';
import { analyzeXlsxHeaders, analyzeXlsxWithAI, XlsxSchema, XlsxSchemaType, getThemeFromSchema } from './xlsxAnalyzer';

interface ImportResult {
  totalRows: number;
  importedRows: number;
  schema: XlsxSchema;
  contactsCreated: number;
  errors: string[];
}

interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

function readXlsx(filePath: string): SheetData[] {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  const result: SheetData[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (jsonData.length === 0) continue;
    const headers = (jsonData[0] || []).map((c: any) => String(c || '').trim()).filter(Boolean);
    if (headers.length === 0) continue;
    const rows: string[][] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row) continue;
      const cells = headers.map((_, ci) => {
        const val = row[ci];
        return val !== undefined && val !== null ? String(val).trim() : '';
      });
      if (cells.some(c => c.length > 0)) rows.push(cells);
    }
    result.push({ name: sheetName, headers, rows });
  }
  return result;
}

function autoImportContacts(
  sourceFileId: number,
  rows: string[][],
  columns: { header: string; mappedField?: string }[]
): number {
  let created = 0;
  const nameIdx = columns.findIndex(c => c.mappedField === 'nome');
  const phoneIdx = columns.findIndex(c => c.mappedField === 'telefone');
  const emailIdx = columns.findIndex(c => c.mappedField === 'email');
  const orgIdx = columns.findIndex(c => c.mappedField === 'organizacao');
  const roleIdx = columns.findIndex(c => c.mappedField === 'cargo');
  const notesIdx = columns.findIndex(c => c.mappedField === 'observacao');
  if (nameIdx < 0) return 0;
  const db = getDatabase();
  if (!db) return 0;
  for (const row of rows) {
    const name = row[nameIdx] || '';
    if (!name || name.length < 3) continue;
    const existsStmt = db.prepare('SELECT id FROM contacts WHERE name = ?');
    existsStmt.bind([name]);
    if (existsStmt.step()) { existsStmt.free(); continue; }
    existsStmt.free();
    insertContact({
      name,
      role: roleIdx >= 0 ? row[roleIdx] || '' : '',
      organization: orgIdx >= 0 ? row[orgIdx] || '' : '',
      phone: phoneIdx >= 0 ? row[phoneIdx] || '' : '',
      email: emailIdx >= 0 ? row[emailIdx] || '' : '',
      notes: notesIdx >= 0 ? row[notesIdx] || '' : '',
    });
    created++;
  }
  return created;
}

function buildRowObject(row: string[], columns: { header: string; mappedField?: string }[]): Record<string, string> {
  const obj: Record<string, string> = {};
  columns.forEach((col, i) => {
    const key = col.mappedField || col.header.toLowerCase().replace(/[^a-z0-9]/g, '_');
    obj[key] = row[i] || '';
  });
  return obj;
}

export async function importXlsxStructured(
  filePath: string,
  sourceFileId: number,
  useAI: boolean = true
): Promise<ImportResult> {
  const result: ImportResult = {
    totalRows: 0,
    importedRows: 0,
    schema: { type: 'desconhecido', columns: [], confidence: 0, suggestedSection: 'Geral', sheetName: '' },
    contactsCreated: 0,
    errors: [],
  };
  try {
    const sheetsList = readXlsx(filePath);
    if (sheetsList.length === 0) {
      result.errors.push('Nenhuma planilha encontrada');
      return result;
    }
    for (const sheet of sheetsList) {
      result.totalRows += sheet.rows.length;
      let schema: XlsxSchema;
      if (useAI) {
        schema = await analyzeXlsxWithAI(sheet.headers, sheet.rows.slice(0, 10), sheet.name);
      } else {
        schema = analyzeXlsxHeaders(sheet.headers, sheet.rows.slice(0, 10));
        schema.sheetName = sheet.name;
      }
      result.schema = schema;
      const theme = getThemeFromSchema(schema.type);
      for (const row of sheet.rows) {
        const rowObj = buildRowObject(row, schema.columns);
        insertStructuredData({
          source_file_id: sourceFileId,
          schema_type: schema.type,
          data: rowObj,
          theme,
          confidence: schema.confidence,
        });
        result.importedRows++;
      }
      if (schema.type === 'contatos') {
        result.contactsCreated = autoImportContacts(sourceFileId, sheet.rows, schema.columns);
      }
      insertKnowledgeRelation({
        source_type: 'file',
        source_id: sourceFileId,
        target_type: 'structured_data_sheet',
        target_id: 0,
        relation_type: 'contem',
        confidence: 1.0,
        metadata: { sheet: sheet.name, schema_type: schema.type, rows: sheet.rows.length, theme },
      });
    }
  } catch (e: any) {
    result.errors.push(e.message);
  }
  return result;
}

export { readXlsx };
