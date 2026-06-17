import { XMLParser } from 'fast-xml-parser';

export function extractTableFromXml(xmlText: string): { headers: string[]; rows: any[][] } {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const result = parser.parse(xmlText);
    
    // Helper to find the first array in the parsed XML object
    const findArray = (obj: any): any[] | null => {
      if (Array.isArray(obj)) return obj;
      if (typeof obj === 'object' && obj !== null) {
        for (const key of Object.keys(obj)) {
          const found = findArray(obj[key]);
          if (found) return found;
        }
      }
      return null;
    };
    
    const targetArray = findArray(result);
    
    if (!targetArray || targetArray.length === 0) {
      return { headers: [], rows: [] };
    }
    
    // Extract headers
    const headersSet = new Set<string>();
    const sampleSize = Math.min(10, targetArray.length);
    for (let i = 0; i < sampleSize; i++) {
      const item = targetArray[i];
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => headersSet.add(key));
      }
    }
    
    const headers = Array.from(headersSet);
    
    if (headers.length === 0) {
       return { headers: [], rows: [] };
    }
    
    // Extract rows
    const rows: any[][] = [];
    for (const item of targetArray) {
      if (typeof item === 'object' && item !== null) {
        const row = headers.map(header => {
          const val = item[header];
          if (val === undefined || val === null) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        });
        rows.push(row);
      }
    }
    
    return { headers, rows };
    
  } catch (e) {
    return { headers: [], rows: [] };
  }
}
