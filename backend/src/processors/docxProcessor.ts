import fs from 'fs';

export async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    const mammoth = require('mammoth');
    const dataBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return (result.value || '').trim();
  } catch (e) {
    return `[Falha ao extrair texto de DOCX: ${filePath}]`;
  }
}
