import fs from 'fs';
import { logger } from '../lib/logger';

export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const fileName = filePath.split(/[/\\]/).pop() || 'document.pdf';
    
    // Attempt Python Service
    try {
      const formData = new FormData();
      const blob = new Blob([dataBuffer], { type: 'application/pdf' });
      formData.append('file', blob, fileName);

      const res = await fetch('http://localhost:8000/extract', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000) // Give Python up to 60s for huge PDFs
      });
      
      if (res.ok) {
        const json = await res.json() as any;
        if (json.text && json.text.length > 10) return json.text.trim();
      }
    } catch (pythonErr: any) {
      logger.warn('Python PDF extractor falhou, usando pdf-parse (fallback)', { error: pythonErr.message });
    }

    const pdfParse = require('pdf-parse');
    const data = await pdfParse(dataBuffer);
    const text = (data.text || '').trim();
    if (text.length > 30) return text;
    if (text.length <= 30 && (data.numpages || 0) > 0) {
      return `[PDF com ${data.numpages} páginas - conteúdo escaneado/ imagem. Texto extraído mínimo: "${text.substring(0, 100)}"]`;
    }
    return text;
  } catch (e) {
    return `[Erro ao processar PDF]`;
  }
}
