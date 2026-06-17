export async function extractTextFromImage(filePath: string): Promise<string> {
  try {
    const Tesseract = require('tesseract.js');
    const { data } = await Tesseract.recognize(filePath, 'por', {
      logger: () => {},
    });
    return (data.text || '').trim();
  } catch (e: any) {
    if (e && e.message && e.message.includes('PDF')) {
      return '';
    }
    return `[Falha ao extrair texto de imagem]`;
  }
}
