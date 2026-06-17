import * as htmlparser2 from 'htmlparser2';

export function extractTableFromHtml(htmlText: string): { headers: string[]; rows: any[][] } {
  const tables: { headers: string[]; rows: string[][] }[] = [];
  
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let currentRow: string[] = [];
  let currentCell = '';
  let inTable = false;
  let inRow = false;
  let inCell = false;
  let isHeader = false;

  const parser = new htmlparser2.Parser({
    onopentag(name) {
      const tag = name.toLowerCase();
      if (tag === 'table') {
        inTable = true;
        currentTable = { headers: [], rows: [] };
      } else if (tag === 'tr' && inTable) {
        inRow = true;
        currentRow = [];
      } else if ((tag === 'td' || tag === 'th') && inRow) {
        inCell = true;
        currentCell = '';
        isHeader = tag === 'th';
      }
    },
    ontext(text) {
      if (inCell) {
        currentCell += text;
      }
    },
    onclosetag(name) {
      const tag = name.toLowerCase();
      if (tag === 'table' && inTable) {
        inTable = false;
        if (currentTable && (currentTable.headers.length > 0 || currentTable.rows.length > 0)) {
           tables.push(currentTable);
        }
        currentTable = null;
      } else if (tag === 'tr' && inRow) {
        inRow = false;
        if (currentTable && currentRow.length > 0) {
          // If it's the first row and we don't have headers, treat it as headers
          // Or if we specifically saw <th> tags
          if (isHeader || (currentTable.headers.length === 0 && currentTable.rows.length === 0)) {
             currentTable.headers = [...currentRow];
          } else {
             currentTable.rows.push([...currentRow]);
          }
        }
      } else if ((tag === 'td' || tag === 'th') && inCell) {
        inCell = false;
        currentRow.push(currentCell.trim());
      }
    }
  });

  try {
    parser.write(htmlText);
    parser.end();
    
    if (tables.length === 0) {
      return { headers: [], rows: [] };
    }
    
    // Return the largest table found
    tables.sort((a, b) => b.rows.length - a.rows.length);
    return tables[0];
    
  } catch (e) {
    return { headers: [], rows: [] };
  }
}
