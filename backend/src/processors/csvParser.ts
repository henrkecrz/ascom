import fs from 'fs';
import { logger } from '../lib/logger';

/**
 * Robust CSV/TSV parser supporting RFC 4180
 * Features:
 * - Auto-delimiter detection (comma, semicolon, tab, pipe)
 * - Quotes handling
 * - Newlines inside quotes
 */
export function parseCsvContent(content: string, forceDelimiter?: string): { headers: string[]; rows: string[][] } {
  const text = content.trim();
  if (!text) return { headers: [], rows: [] };

  // Auto-detect delimiter
  let delimiter = forceDelimiter;
  if (!delimiter) {
    const sample = text.substring(0, 1000);
    const firstLine = sample.split('\n')[0] || '';
    const counts = {
      ',': (firstLine.match(/,/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
      '|': (firstLine.match(/\|/g) || []).length,
    };
    
    // Find the one with highest count
    delimiter = Object.keys(counts).reduce((a, b) => counts[a as keyof typeof counts] > counts[b as keyof typeof counts] ? a : b) as string;
    if (counts[delimiter as keyof typeof counts] === 0) delimiter = ','; // default
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++; // Skip next quote
        } else {
          // End of quotes
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell.trim());
        // Only push row if it's not completely empty
        if (currentRow.some(c => c.length > 0)) {
           rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++; // Skip \n
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
  }

  // Push last cell/row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}
