import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initDatabase, insertFile, saveDatabase, getDatabase, storeFileBlob, getSetting, flushDatabase, deleteFile, getFilesBySource, upsertSourceFileState } from './database';
import { getAllDataSources, updateLastScanned } from './db/dataSources';
import { importFile } from './analysis/smartImporter';
import { logger } from './lib/logger';
import { enqueueFile, enqueueGlobalStages } from './queue';

let isScanning = false;

const MAX_BLOB_SIZE = 200 * 1024 * 1024;
const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const BATCH_SIZE = 50;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
}

function getCategory(fullPath: string, rootDir: string, rootLabel: string): string {
  const relativePath = path.relative(rootDir, fullPath);
  const parts = relativePath.split(path.sep);
  if (parts.length <= 1) return rootLabel;
  if (parts.length >= 3) return rootLabel + ' > ' + parts.slice(1, -1).join(' > ');
  return rootLabel + ' > ' + parts.slice(0, -1).join(' > ');
}

function getParentFolder(fullPath: string, rootDir: string): string {
  const relativePath = path.relative(rootDir, fullPath);
  const parts = relativePath.split(path.sep);
  if (parts.length <= 1) return 'Raiz';
  return parts.slice(0, -1).join(' > ');
}

const STORABLE_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.heic',
  '.mp4', '.avi', '.mov', '.zip', '.rar',
  '.txt', '.csv', '.tsv', '.md', '.json', '.xml', '.html', '.htm',
]);

const IMPORTABLE_EXTENSIONS = new Set([
  '.xlsx', '.xls', '.csv', '.tsv', '.docx', '.pdf',
]);

function copyToCache(sourcePath: string, relativePath: string, sourceId: number): string | null {
  const dest = path.join(CACHE_DIR, String(sourceId), relativePath);
  const destDir = path.dirname(dest);
  try {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(sourcePath, dest);
    return dest;
  } catch (err) {
    logger.warn(`Falha ao copiar ${sourcePath} para cache`, err);
    return null;
  }
}

function computeMd5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

interface ScanCounters {
  newCount: number;
  modifiedCount: number;
}

async function scanDirectory(dirPath: string, rootDir: string, rootLabel: string, storeBlobs: boolean, sourceId: number, currentPaths: Set<string>, counters: ScanCounters): Promise<void> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  const fileEntries = entries.filter(e => !e.isDirectory());
  const dirEntries = entries.filter(e => e.isDirectory());

  for (let i = 0; i < fileEntries.length; i += BATCH_SIZE) {
    const batch = fileEntries.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const nameLower = entry.name.toLowerCase();
      if (nameLower === 'thumbs.db' || nameLower === '.ds_store' || nameLower.startsWith('~$')) {
        return;
      }

      currentPaths.add(fullPath);

      try {
        const stats = await fs.promises.stat(fullPath);
        const ext = path.extname(entry.name).toLowerCase() || null;
        const relativePath = path.relative(rootDir, fullPath);
        const sizeFormatted = formatFileSize(stats.size);
        const lastModified = stats.mtime.toISOString();
        const category = getCategory(fullPath, rootDir, rootLabel);
        const parentFolder = getParentFolder(fullPath, rootDir);
        const depth = relativePath.split(path.sep).length - 1;

        const md5Hash = await computeMd5(fullPath);

        const db = getDatabase();
        const existing = db.prepare('SELECT id, md5_hash, full_path FROM files WHERE full_path = ? OR id IN (SELECT file_id FROM source_file_state WHERE source_path = ?) LIMIT 1');
        existing.bind([fullPath, fullPath]);
        const exists = existing.step();
        const existingObj = exists ? existing.getAsObject() as any : null;
        const existingId = exists ? Number(existingObj.id) : null;
        const existingHash = exists ? String(existingObj.md5_hash || '') : '';
        existing.free();

        if (existingId) {
          let cachedPath: string | null = null;
          if (sourceId && ext && IMPORTABLE_EXTENSIONS.has(ext)) {
            cachedPath = copyToCache(fullPath, relativePath, sourceId);
          }
          if (existingHash !== md5Hash) {
            db.run(`UPDATE files SET name=?, full_path=?, relative_path=?, extension=?, size_bytes=?, size_formatted=?, last_modified=?, category=?, parent_folder=?, depth=?, md5_hash=?, source_id=?
                     WHERE id=?`,
              [entry.name, cachedPath || fullPath, relativePath, ext, stats.size, sizeFormatted, lastModified, category, parentFolder, depth, md5Hash, sourceId, existingId]);
            enqueueFile(existingId, 0);
            counters.modifiedCount++;
            logger.info(`  🔄 Modificado: ${entry.name}`);
          }
          upsertSourceFileState({ fileId: existingId, sourceId, sourcePath: fullPath, cachePath: cachedPath || '', md5Hash, lastModified, exists: true });
        } else {
          const fileId = insertFile({
            name: entry.name,
            full_path: fullPath,
            relative_path: relativePath,
            extension: ext,
            size_bytes: stats.size,
            size_formatted: sizeFormatted,
            last_modified: lastModified,
            category,
            parent_folder: parentFolder,
            depth,
          });

          if (fileId) {
            db.run('UPDATE files SET md5_hash = ?, source_id = ? WHERE id = ?', [md5Hash, sourceId, fileId]);
            enqueueFile(fileId, 0);
            counters.newCount++;

            let cachedPath: string | null = null;
            if (sourceId && ext && IMPORTABLE_EXTENSIONS.has(ext)) {
              cachedPath = copyToCache(fullPath, relativePath, sourceId);
              if (cachedPath) {
                db.run('UPDATE files SET full_path = ? WHERE id = ?', [cachedPath, fileId]);
              }
            }
            upsertSourceFileState({ fileId, sourceId, sourcePath: fullPath, cachePath: cachedPath || '', md5Hash, lastModified, exists: true });

            if (storeBlobs && ext && STORABLE_EXTENSIONS.has(ext) && stats.size <= MAX_BLOB_SIZE) {
              try {
                const data = fs.readFileSync(cachedPath || fullPath);
                storeFileBlob(fileId, data);
              } catch (readErr) {
                logger.warn(`Não foi possível armazenar blob de: ${fullPath}`, { error: (readErr as Error)?.message });
              }
            }

            logger.info(`  ✅ Novo: ${entry.name}`);
          }
        }
      } catch (err) {
        logger.error(`Erro ao processar ${fullPath}`, { error: (err as Error)?.message });
      }
    }));
  }

  for (const dirEntry of dirEntries) {
    await scanDirectory(path.join(dirPath, dirEntry.name), rootDir, rootLabel, storeBlobs, sourceId, currentPaths, counters);
  }
}

export async function runScan(): Promise<void> {
  if (isScanning) {
    logger.info('Scan já em andamento, ignorando nova chamada.');
    return;
  }
  isScanning = true;

  try {
    await initDatabase();
    const sources = getAllDataSources(true).filter(s => s.type === 'documentos');

    if (sources.length === 0) {
      logger.warn('Nenhuma fonte de documentos configurada. Use as configurações para adicionar.');
      isScanning = false;
      return;
    }

    logger.info('Iniciando sincronização das fontes configuradas', { roots: sources.map(s => s.path) });

    const storeBlobs = getSetting('store_original_files') === 'true';
    logger.info(`Armazenamento de originais: ${storeBlobs ? 'ativado' : 'desativado'}`);

    const db = getDatabase();

    const scanRecords: Array<{
      source_id: number; source_label: string; source_path: string;
      new_count: number; modified_count: number; removed_count: number;
      total_files: number; total_size_bytes: number; online: number;
    }> = [];

    for (const source of sources) {
      const online = fs.existsSync(source.path);
      if (!online) {
        logger.warn(`Diretório não encontrado, pulando: ${source.path}`);
        const existingFiles = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total FROM files WHERE source_id = ?');
        existingFiles.bind([source.id]);
        existingFiles.step();
        const row = existingFiles.getAsObject() as any;
        existingFiles.free();
        scanRecords.push({
          source_id: source.id,
          source_label: source.label,
          source_path: source.path,
          new_count: 0, modified_count: 0, removed_count: 0,
          total_files: Number(row.count),
          total_size_bytes: Number(row.total),
          online: 0,
        });
        continue;
      }

      logger.info(`Sincronizando: ${source.label} (${source.path})`);

      const dbFiles = getFilesBySource(source.id);
      const currentPaths = new Set<string>();
      const counters: ScanCounters = { newCount: 0, modifiedCount: 0 };

      await scanDirectory(source.path, source.path, source.label, storeBlobs, source.id, currentPaths, counters);

      let removedCount = 0;
      for (const [dbPath, fileId] of dbFiles) {
        const srcStmt = db.prepare('SELECT source_path FROM source_file_state WHERE file_id = ? LIMIT 1');
        srcStmt.bind([fileId]);
        const sourcePath = srcStmt.step() ? String(srcStmt.getAsObject().source_path || dbPath) : dbPath;
        srcStmt.free();
        if (!currentPaths.has(sourcePath)) {
          const fileStmt = db.prepare('SELECT name FROM files WHERE id = ?');
          fileStmt.bind([fileId]);
          const name = fileStmt.step() ? String(fileStmt.getAsObject().name) : 'desconhecido';
          fileStmt.free();
          upsertSourceFileState({ fileId, sourceId: source.id, sourcePath, exists: false });
          deleteFile(fileId);
          removedCount++;
          logger.info(`  🗑️ Removido: ${name} (não encontrado em disco)`);
        }
      }

      if (removedCount > 0) {
        logger.info(`  ${removedCount} arquivo(s) removido(s) do banco por não existirem mais em disco`);
      }

      const srcStats = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total FROM files WHERE source_id = ?');
      srcStats.bind([source.id]);
      srcStats.step();
      const sRow = srcStats.getAsObject() as any;
      srcStats.free();

      scanRecords.push({
        source_id: source.id,
        source_label: source.label,
        source_path: source.path,
        new_count: counters.newCount,
        modified_count: counters.modifiedCount,
        removed_count: removedCount,
        total_files: Number(sRow.count),
        total_size_bytes: Number(sRow.total),
        online: 1,
      });

      updateLastScanned(source.id);
    }

    // Grava scan_log
    const now = new Date().toISOString();
    const logStmt = db.prepare(`INSERT INTO scan_log (source_id, source_label, source_path, new_count, modified_count, removed_count, total_files, total_size_bytes, online, scanned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const rec of scanRecords) {
      logStmt.bind([rec.source_id, rec.source_label, rec.source_path, rec.new_count, rec.modified_count, rec.removed_count, rec.total_files, rec.total_size_bytes, rec.online ? 1 : 0, now]);
      logStmt.step();
      logStmt.reset();
    }
    logStmt.free();

    flushDatabase();

    const stmt = db.prepare('SELECT COUNT(*) as count FROM files');
    stmt.step();
    const count = Number(stmt.getAsObject().count);
    stmt.free();

    const onlineSources = scanRecords.filter(r => r.online);
    const totalScanned = onlineSources.reduce((a, r) => a + r.new_count, 0);
    logger.info(`Sincronização concluída`, { files: count, sources_online: onlineSources.length, new_files: totalScanned, removed: scanRecords.reduce((a, r) => a + r.removed_count, 0) });

    enqueueGlobalStages();

  } catch (globalErr: any) {
    logger.error('Erro crítico durante a sincronização', { error: globalErr.message });
  } finally {
    flushDatabase();
    isScanning = false;
  }
}

export function startScannerCron(intervalMs: number): void {
  logger.info(`Cron Job do scanner iniciado. Intervalo: ${intervalMs / 60000} minutos.`);
  setInterval(() => {
    runScan().catch(err => logger.error('Falha no cron do escaneamento', err));
  }, intervalMs);
}

if (require.main === module) {
  runScan().catch((err) => logger.error('Falha no escaneamento', err));
}
