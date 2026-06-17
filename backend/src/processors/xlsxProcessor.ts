import fs from 'fs';

export function extractTextFromXlsx(filePath: string): string {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const lines: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      for (const row of jsonData) {
        if (!row) continue;
        const cells = row
          .filter((c: any) => c !== undefined && c !== null && String(c).trim())
          .map((c: any) => String(c).trim());
        if (cells.length > 0) {
          lines.push(cells.join(' | '));
        }
      }
    }

    return lines.join('\n');
  } catch (e) {
    return `[Falha ao extrair texto de XLSX: ${filePath}]`;
  }
}
