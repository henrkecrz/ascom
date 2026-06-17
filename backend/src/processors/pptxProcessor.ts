import fs from 'fs';
import path from 'path';

export async function extractTextFromPptx(filePath: string): Promise<string> {
  try {
    const JSZip = require('jszip');
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    const slides: string[] = [];

    const slideFiles = Object.keys(zip.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort();

    for (const slideFile of slideFiles) {
      const content = await zip.files[slideFile].async('text');
      const textMatches = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
      const texts = textMatches.map((m: string) => {
        const match = m.match(/<a:t[^>]*>([^<]+)<\/a:t>/);
        return match ? match[1] : '';
      });
      if (texts.length > 0) {
        slides.push(texts.join(' '));
      }
    }

    return slides.join('\n\n');
  } catch (e) {
    return `[Falha ao extrair texto de PPTX: ${filePath}]`;
  }
}
