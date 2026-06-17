export function extractTableFromJson(jsonText: string): { headers: string[]; rows: any[][] } {
  try {
    const data = JSON.parse(jsonText);
    
    // Attempt to find an array of objects
    let targetArray: any[] | null = null;
    
    if (Array.isArray(data)) {
      targetArray = data;
    } else if (typeof data === 'object' && data !== null) {
      // Find the first array property that looks like a table
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object') {
          targetArray = data[key];
          break;
        }
      }
    }
    
    if (!targetArray || targetArray.length === 0) {
      return { headers: [], rows: [] };
    }
    
    // Extract headers (all unique keys from the first few objects)
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
