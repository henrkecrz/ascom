import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  insertPhotoEvent, updatePhotoEvent, insertPhoto,
  getAllPhotoEvents, insertPhotoDocumentLink,
  getDatabase, clearPhotoIndex
} from '../database';
import { getAllDataSources } from '../db/dataSources';
import { logger } from '../lib/logger';

const THUMB_DIR = path.join(__dirname, '..', '..', 'data', 'photos', 'thumbs');

function parseEventDate(folderName: string): string {
  const match = folderName.match(/(\d{2})[._](\d{2})[._](\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return new Date().toISOString().split('T')[0];
}

function cleanEventName(folderName: string): string {
  return folderName
    .replace(/^\d{2}_/, '')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-záéíóúâêîôûãõàç0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  return [...new Set(words)];
}

function tokenSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const matches = a.filter(w => setB.has(w)).length;
  return matches / Math.max(a.length, b.length);
}

export async function indexPhotos(regenerateThumbs: boolean = false): Promise<{ events: number; photos: number; links: number }> {
  const photoSources = getAllDataSources(true).filter(s => s.type === 'fotos');
  
  if (photoSources.length === 0) {
    logger.warn('Nenhuma fonte de fotos configurada. Use as configurações para adicionar.');
    return { events: 0, photos: 0, links: 0 };
  }

  const thumbsDir = THUMB_DIR;
  if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

  let totalEvents = 0;
  let totalPhotos = 0;

  for (const photoSource of photoSources) {
    if (!fs.existsSync(photoSource.path)) {
      logger.warn(`Diretório de fotos não encontrado: ${photoSource.path}`);
      continue;
    }

    const months = fs.readdirSync(photoSource.path, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'));

    for (const monthDir of months) {
      const monthPath = path.join(photoSource.path, monthDir.name);
      const events = fs.readdirSync(monthPath, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.'));

      for (const eventDir of events) {
        const eventPath = path.join(monthPath, eventDir.name);
        const eventDate = parseEventDate(eventDir.name);
        const eventName = cleanEventName(eventDir.name);

        const files = fs.readdirSync(eventPath)
          .filter(f => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(f));

        if (files.length === 0) continue;

        const thumbDir = path.join(thumbsDir, `${monthDir.name}_${eventDir.name}`);
        if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

        const eventId = insertPhotoEvent({
          event_date: eventDate,
          event_name: eventName,
          source_path: eventPath,
          month_folder: monthDir.name,
          photo_count: files.length,
        });

        if (!eventId) {
          logger.warn(`Skipping duplicate event: ${eventDir.name}`);
          continue;
        }

        let firstThumb = '';

        for (const file of files.slice(0, 200)) {
          const filePath = path.join(eventPath, file);
          const thumbPath = path.join(thumbDir, `thumb_${file}.jpg`);
          const thumbRel = path.relative(path.join(__dirname, '..', '..'), thumbPath);

          try {
            const stats = fs.statSync(filePath);

            if (!fs.existsSync(thumbPath) || regenerateThumbs) {
              const img = sharp(filePath);
              const metadata = await img.metadata();
              const resized = await img
                .resize(400, 300, { fit: 'cover', position: 'centre' })
                .jpeg({ quality: 70 })
                .toFile(thumbPath);

              insertPhoto({
                event_id: eventId,
                filename: file,
                source_path: filePath,
                thumbnail_path: thumbRel,
                file_size: stats.size,
                width: metadata.width || 0,
                height: metadata.height || 0,
              });
            } else {
              insertPhoto({
                event_id: eventId,
                filename: file,
                source_path: filePath,
                thumbnail_path: thumbRel,
                file_size: stats.size,
              });
            }

            if (!firstThumb) firstThumb = thumbRel;
            totalPhotos++;
          } catch (err: any) {
            logger.error(`Error processing photo ${file}: ${err.message}`);
          }
        }

        if (firstThumb) {
          updatePhotoEvent(eventId, { thumbnail_path: firstThumb, photo_count: files.length });
        }

        totalEvents++;
      }
    }
  }

  const linked = await linkPhotosToDocuments();

  logger.info(`Photo index complete: ${totalEvents} events, ${totalPhotos} photos, ${linked} document links`);
  return { events: totalEvents, photos: totalPhotos, links: linked };
}

async function linkPhotosToDocuments(): Promise<number> {
  const db = getDatabase();
  if (!db) return 0;

  const events = getAllPhotoEvents();
  let totalLinks = 0;

  // Get all document sources - their folder names will be used as keywords
  const docSources = getAllDataSources(true).filter(s => s.type === 'documentos');
  const sourceKeywords = docSources.map(s => {
    // Extract meaningful keywords from the source path: folder names, label words
    const pathParts = s.path.split(path.sep).filter(p => p.length > 0);
    const labelWords = s.label.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return [...new Set([...pathParts, ...labelWords])];
  }).flat();

  // Get all documents
  const docStmt = db.prepare('SELECT id, name, category, doc_type, plan_section, full_path FROM files');
  const allDocs: { id: number; name: string; keywords: string[] }[] = [];
  while (docStmt.step()) {
    const row = docStmt.getAsObject() as any;
    // Extract keywords from doc name, category, plan section, AND the folder path itself
    const text = String(row.name) + ' ' + String(row.category || '') + ' ' + String(row.plan_section || '');
    const keywords = extractKeywords(text);
    // Also add keywords from the document's folder path (parent folders)
    const folderPath = String(row.full_path || '');
    const folderParts = folderPath.split(path.sep).filter((p: string) => p.length > 0);
    const folderKeywords = folderParts.map((p: string) => p.toLowerCase())
      .filter((p: string) => p.length > 2 && !p.includes('.') && !p.match(/^\d+$/));
    allDocs.push({ id: Number(row.id), name: String(row.name), keywords: [...keywords, ...folderKeywords] });
  }
  docStmt.free();

  for (const event of events) {
    const eventKeywords = extractKeywords(event.event_name);

    // Score documents by keyword similarity AND source folder correlation
    const scored = allDocs
      .map(doc => {
        const baseScore = tokenSimilarity(eventKeywords, doc.keywords);
        // Boost score if document's folder path contains event name keywords
        const hasSourceMatch = sourceKeywords.some(sk =>
          eventKeywords.some(ek => sk.toLowerCase().includes(ek) || ek.includes(sk.toLowerCase()))
        );
        return { doc, score: hasSourceMatch ? Math.min(baseScore + 0.2, 1) : baseScore };
      })
      .filter(d => d.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const match of scored) {
      insertPhotoDocumentLink(event.id, match.doc.id, match.score);
      totalLinks++;
    }
  }

  return totalLinks;
}

export { THUMB_DIR };
