import { insertStructuredData, insertContact, insertKnowledgeRelation, getDatabase, insertImportHistory } from '../database';
import { extractTableFromFile } from './tableExtractor';
import { analyzeXlsxHeaders, analyzeXlsxWithAI, XlsxSchema, XlsxSchemaType, getThemeFromSchema } from './xlsxAnalyzer';

interface ImportResult {
  totalRows: number;
  importedRows: number;
  schema: XlsxSchema;
  contactsCreated: number;
  errors: string[];
}

function autoImportContacts(
  sourceFileId: number,
  rows: any[][],
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
    const name = String(row[nameIdx] || '').trim();
    if (!name || name.length < 3) continue;
    const existsStmt = db.prepare('SELECT id FROM contacts WHERE name = ?');
    existsStmt.bind([name]);
    if (existsStmt.step()) { existsStmt.free(); continue; }
    existsStmt.free();
    insertContact({
      name,
      role: roleIdx >= 0 ? String(row[roleIdx] || '').trim() : '',
      organization: orgIdx >= 0 ? String(row[orgIdx] || '').trim() : '',
      phone: phoneIdx >= 0 ? String(row[phoneIdx] || '').trim() : '',
      email: emailIdx >= 0 ? String(row[emailIdx] || '').trim() : '',
      notes: notesIdx >= 0 ? String(row[notesIdx] || '').trim() : '',
    });
    created++;
  }
  return created;
}

function buildRowObject(row: any[], columns: { header: string; mappedField?: string }[]): Record<string, string> {
  const obj: Record<string, string> = {};
  columns.forEach((col, i) => {
    const key = col.mappedField || col.header.toLowerCase().replace(/[^a-z0-9]/g, '_');
    obj[key] = String(row[i] || '').trim();
  });
  return obj;
}

export async function importUnifiedStructured(
  filePath: string,
  extension: string,
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
    const tables = await extractTableFromFile(filePath, extension);
    
    if (tables.length === 0) {
      result.errors.push('Nenhuma tabela encontrada no arquivo.');
      return result;
    }
    
    for (const table of tables) {
      result.totalRows += table.rows.length;
      let schema: XlsxSchema;
      
      const stringRows = table.rows.map(r => r.map(c => String(c)));
      
      if (useAI) {
        schema = await analyzeXlsxWithAI(table.headers, stringRows.slice(0, 10), table.name);
      } else {
        schema = analyzeXlsxHeaders(table.headers, stringRows.slice(0, 10));
        schema.sheetName = table.name;
      }
      
      // Update result schema with the last table's schema (for logging purposes)
      result.schema = schema;
      const theme = getThemeFromSchema(schema.type);
      let insertedInTable = 0;
      
      for (const row of table.rows) {
        const rowObj = buildRowObject(row, schema.columns);
        insertStructuredData({
          source_file_id: sourceFileId,
          schema_type: schema.type,
          data: rowObj,
          theme,
          confidence: schema.confidence,
        });
        result.importedRows++;
        insertedInTable++;
      }
      
      if (insertedInTable > 0) {
         // Look up source_id using getDatabase if we only have sourceFileId
         const db = getDatabase();
         let srcId = 0;
         if (db) {
            const stmt = db.prepare('SELECT source_id FROM files WHERE id = ?');
            stmt.bind([sourceFileId]);
            if (stmt.step()) srcId = Number(stmt.getAsObject().source_id);
            stmt.free();
         }
         insertImportHistory({
           source_id: srcId,
           file_id: sourceFileId,
           table_name: 'structured_data',
           rows_inserted: insertedInTable
         });
      }
      
      if (schema.type === 'contatos') {
        result.contactsCreated += autoImportContacts(sourceFileId, table.rows, schema.columns);
      }
      
      insertKnowledgeRelation({
        source_type: 'file',
        source_id: sourceFileId,
        target_type: 'structured_data_sheet',
        target_id: 0,
        relation_type: 'contem',
        confidence: 1.0,
        metadata: { sheet: table.name, schema_type: schema.type, rows: table.rows.length, theme },
      });
    }
  } catch (e: any) {
    result.errors.push(e.message);
  }
  return result;
}
