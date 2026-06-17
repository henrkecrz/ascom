import path from 'path';
import { extractTextFromPdf } from './pdfProcessor';
import { extractTextFromDocx } from './docxProcessor';
import { extractTextFromDoc } from './docProcessor';
import { extractTextFromXlsx } from './xlsxProcessor';
import { extractTextFromImage } from './imageProcessor';
import { extractTextFromPptx } from './pptxProcessor';

const TEXT_EXTENSIONS = new Set(['.txt', '.csv', '.md', '.json', '.xml', '.html', '.htm']);

export async function extractText(filePath: string, extension: string | null): Promise<string> {
  const ext = (extension || path.extname(filePath)).toLowerCase();

  try {
    switch (ext) {
      case '.pdf':
        return await extractTextFromPdf(filePath);

      case '.docx':
        return await extractTextFromDocx(filePath);

      case '.doc':
        return await extractTextFromDoc(filePath);

      case '.xlsx':
      case '.xls':
        return extractTextFromXlsx(filePath);

      case '.pptx':
      case '.ppt':
        return await extractTextFromPptx(filePath);

      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.bmp':
      case '.tiff':
      case '.tif':
      case '.webp':
        return await extractTextFromImage(filePath);

      default:
        if (TEXT_EXTENSIONS.has(ext)) {
          const fs = require('fs');
          return fs.readFileSync(filePath, 'utf-8').trim();
        }
        return '';
    }
  } catch (e) {
    return `[Erro ao processar: ${filePath}]`;
  }
}

export function isExtractable(extension: string | null): boolean {
  if (!extension) return false;
  const extractable = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.txt', '.csv', '.md', '.json', '.xml', '.html', '.htm'];
  return extractable.includes(extension.toLowerCase());
}
