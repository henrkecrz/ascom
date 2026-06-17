import path from 'path';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { extractText } from './textExtractor';
import { extractTableFromJson } from './jsonTableExtractor';
import { extractTableFromXml } from './xmlTableExtractor';
import { extractTableFromHtml } from './htmlTableExtractor';
import { parseCsvContent } from './csvParser';
import { logger } from '../lib/logger';

export interface ExtractedTable {
  name: string;
  headers: string[];
  rows: any[][];
}

export async function extractTableFromFile(filePath: string, extension: string): Promise<ExtractedTable[]> {
  const ext = extension.toLowerCase();
  
  try {
    // 1. XLSX, XLS
    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const results: ExtractedTable[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' }) as any[][];
        if (jsonData.length === 0) continue;
        const headers = (jsonData[0] || []).map((h: any) => String(h).trim());
        const rows = jsonData.slice(1).filter((row: any[]) => row.some((cell: any) => String(cell).trim() !== ''));
        if (headers.length > 0 || rows.length > 0) {
          results.push({ name: sheetName, headers, rows });
        }
      }
      return results;
    }

    // 2. CSV, TSV
    if (ext === '.csv' || ext === '.tsv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const table = parseCsvContent(content, ext === '.tsv' ? '\t' : undefined);
      if (table.headers.length > 0 || table.rows.length > 0) {
         return [{ name: path.basename(filePath), headers: table.headers, rows: table.rows }];
      }
      return [];
    }

    // 3. JSON
    if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const table = extractTableFromJson(content);
      if (table.headers.length > 0 || table.rows.length > 0) {
         return [{ name: 'JSON Data', headers: table.headers, rows: table.rows }];
      }
      return [];
    }

    // 4. XML
    if (ext === '.xml') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const table = extractTableFromXml(content);
      if (table.headers.length > 0 || table.rows.length > 0) {
         return [{ name: 'XML Data', headers: table.headers, rows: table.rows }];
      }
      return [];
    }
    
    // 5. HTML
    if (ext === '.html' || ext === '.htm') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const table = extractTableFromHtml(content);
      if (table.headers.length > 0 || table.rows.length > 0) {
         return [{ name: 'HTML Table', headers: table.headers, rows: table.rows }];
      }
      return [];
    }

    // 6. Fallback
    return [];
    
  } catch (err: any) {
    logger.error(`Table extraction failed for ${filePath}`, { error: err.message });
    return [];
  }
}
