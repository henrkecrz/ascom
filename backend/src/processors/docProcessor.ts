import fs from 'fs';

export async function extractTextFromDoc(filePath: string): Promise<string> {
  try {
    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(filePath);
    return (extracted.getBody() || '').trim();
  } catch (e) {
    return `[Falha ao extrair texto de DOC: ${filePath}]`;
  }
}
