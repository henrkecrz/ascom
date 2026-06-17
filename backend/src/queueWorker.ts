import { getNextPending, claimItem, completeItem, QueueItem, getExponentialDelay } from './queue';
import { getFileById, getDatabase, createDocumentVersion, createChangeEventFromVersions, getLatestDocumentVersion } from './database';
import { extractText, isExtractable } from './processors/textExtractor';
import { extractKeywords, generateSummary, extractTopics, clearTfIdfCache } from './analysis/nlpService';
import { classifyWithAI, getDocTypeLabel } from './analysis/aiClassifier';
import { extractEntities, extractEntitiesAsync, serializeEntities } from './analysis/entityExtractor';
import { computeAllSimilarities } from './analysis/similarity';
import { generateClusters } from './analysis/cluster';
import { buildKnowledgeGraph } from './analysis/knowledgeGraph';
import { importUnifiedStructured } from './processors/unifiedImporter';
import { processDocxIntelligently } from './processors/docxStructureExtractor';
import { generateScenarios, generateScenarioFromDocuments, generateTalkingPoints } from './services/simulatorAi';
import { insertScenario, getScenarioCategories, insertTalkingPoint, getTalkingPoints } from './database';
import { executeQueueAgentStage } from './queueAgents/queueAgentOrchestrator';
import { runSiteAgentsSync } from './siteAgents/siteAgentOrchestrator';
import { logger } from './lib/logger';

const STAGE_TIMEOUT = 120000;

let workerInterval: any = null;
let isRunning = false;
let paused = false;
let itemsProcessed = 0;
let currentItem: { id: number; file_id: number; stage: string; file_name: string } | null = null;

const preAnalyzeVersions = new Map<number, any | null>();

export function getCurrentProcessing(): { id: number; file_id: number; stage: string; file_name: string } | null {
  return currentItem;
}

export function startWorker(intervalMs: number = 3000): void {
  if (workerInterval) return;
  logger.info('Iniciando worker de fila de processamento', { intervalMs });
  workerInterval = setInterval(tick, intervalMs);
  tick();
}

export function stopWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
  isRunning = false;
  logger.info('Worker de fila parado');
}

export function pauseWorker(): void {
  paused = true;
  logger.info('Worker pausado');
}

export function resumeWorker(): void {
  paused = false;
  logger.info('Worker retomado');
  tick();
}

export function isPaused(): boolean {
  return paused;
}

export function getProcessedCount(): number {
  return itemsProcessed;
}

function getFileName(item: QueueItem): string {
  if (item.file_id === 0) return `[Global] ${item.stage}`;
  try {
    const doc = getFileById(item.file_id);
    return doc ? doc.name : `#${item.file_id}`;
  } catch {
    return `#${item.file_id}`;
  }
}

async function tick(): Promise<void> {
  if (isRunning || paused) return;
  isRunning = true;

  try {
    const item = getNextPending();
    if (!item) {
      isRunning = false;
      return;
    }

    claimItem(item.id);

    const fileName = getFileName(item);
    currentItem = { id: item.id, file_id: item.file_id, stage: item.stage, file_name: fileName };
    logger.info(`Processando queue #${item.id}: file=${fileName} stage=${item.stage}`);

    const success = await processItemWithTimeout(item);

    if (success) {
      completeItem(item.id, 'done');
      itemsProcessed++;
      logger.info(`Concluído queue #${item.id}: file=${fileName} stage=${item.stage}`);
    } else {
      completeItem(item.id, 'error', 'Falha no processamento');
      const delay = getExponentialDelay(item.retry_count);
      logger.warn(`Falha queue #${item.id}: file=${fileName} stage=${item.stage} retry=${item.retry_count} backoff=${delay}ms`);
    }
  } catch (err: any) {
    logger.error('Erro no tick do worker', { error: err?.message });
  } finally {
    currentItem = null;
    isRunning = false;
  }
}

async function processItemWithTimeout(item: QueueItem): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STAGE_TIMEOUT);

  try {
    await processItem(item, controller.signal);
    return true;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.error(`Timeout queue #${item.id}: stage=${item.stage} exceeded ${STAGE_TIMEOUT}ms`);
      return false;
    }
    logger.error(`Erro queue #${item.id}: stage=${item.stage}`, { error: err.message });
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function processItem(item: QueueItem, signal: AbortSignal): Promise<void> {
  const stage = item.stage;
  const fileId = item.file_id;

  if (fileId === 0) {
    await executeQueueAgentStage(item, { signal }, () => processGlobalStage(stage, signal));
    return;
  }

  const doc = getFileById(fileId);
  if (!doc) {
    completeItem(item.id, 'skipped', 'Documento não encontrado');
    return;
  }

  switch (stage) {
    case 'extract':
      await executeQueueAgentStage(item, { file: doc, signal }, () => processExtract(doc, signal));
      break;
    case 'analyze':
      await executeQueueAgentStage(item, { file: doc, signal }, () => processAnalyze(doc, signal));
      break;
    case 'risk':
      await executeQueueAgentStage(item, { file: doc, signal }, async () => undefined);
      break;
    case 'structure':
      await executeQueueAgentStage(item, { file: doc, signal }, () => processStructure(doc, signal));
      break;
    default:
      completeItem(item.id, 'skipped', `Estágio desconhecido: ${stage}`);
  }
}

async function processExtract(doc: any, signal: AbortSignal): Promise<void> {
  const oldVersion = getLatestDocumentVersion(doc.id) || createDocumentVersion(doc.id);
  preAnalyzeVersions.set(doc.id, oldVersion);

  if (!doc.extension || !isExtractable(doc.extension)) {
    const db = getDatabase();
    if (db) {
      db.run('DELETE FROM document_text WHERE file_id = ?', [doc.id]);
      db.run(`INSERT INTO document_text (file_id, raw_text, extracted_at, status) VALUES (?, '', ?, 'skipped')`,
        [doc.id, new Date().toISOString()]);
    }
    return;
  }

  const text = await extractText(doc.full_path, doc.extension);
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM document_text WHERE file_id = ?', [doc.id]);
  db.run(`INSERT INTO document_text (file_id, raw_text, extracted_at, status) VALUES (?, ?, ?, ?)`,
    [doc.id, text, new Date().toISOString(), text ? 'done' : 'empty']);
}

async function processAnalyze(doc: any, signal: AbortSignal): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  const textStmt = db.prepare('SELECT raw_text, status FROM document_text WHERE file_id = ?');
  textStmt.bind([doc.id]);
  let rawText = '';
  let textStatus = '';
  if (textStmt.step()) {
    const row = textStmt.getAsObject() as any;
    rawText = String(row.raw_text || '');
    textStatus = String(row.status || '');
  }
  textStmt.free();

  if (!rawText || rawText.length <= 10) {
    const cls = await classifyWithAI(doc.name, '', doc.category);
    const db2 = getDatabase();
    if (db2) {
      db2.run('UPDATE files SET doc_type = ?, doc_type_confidence = ?, plan_section = ? WHERE id = ?',
        [cls.docType, cls.confidence, cls.planSection, doc.id]);
    }
    if (db) {
      db.run('DELETE FROM document_summary WHERE file_id = ?', [doc.id]);
      db.run(`INSERT INTO document_summary (file_id, summary, keywords, topics, word_count) VALUES (?, '', '', '', 0)`,
        [doc.id]);
    }
    finalizeDocumentVersioning(doc.id);
    return;
  }

  const keywords = extractKeywords(rawText);
  const summary = generateSummary(rawText);
  const topics = extractTopics(rawText);
  const wordCount = rawText.split(/\s+/).length;

  if (db) {
    db.run('DELETE FROM document_summary WHERE file_id = ?', [doc.id]);
    db.run(`INSERT INTO document_summary (file_id, summary, keywords, topics, word_count) VALUES (?, ?, ?, ?, ?)`,
      [doc.id, summary, keywords.join(', '), topics.join(', '), wordCount]);
  }

  const cls = await classifyWithAI(doc.name, rawText, doc.category);
  if (db) {
    db.run('UPDATE files SET doc_type = ?, doc_type_confidence = ?, plan_section = ? WHERE id = ?',
      [cls.docType, cls.confidence, cls.planSection, doc.id]);
  }

  const entities = await extractEntitiesAsync(rawText);
  if (db) {
    db.run('UPDATE files SET entities = ? WHERE id = ?', [serializeEntities(entities), doc.id]);
  }

  finalizeDocumentVersioning(doc.id);
}

function finalizeDocumentVersioning(fileId: number): void {
  try {
    const oldVersion = preAnalyzeVersions.get(fileId) || null;
    const newVersion = createDocumentVersion(fileId);
    if (newVersion) createChangeEventFromVersions(fileId, oldVersion, newVersion);
    preAnalyzeVersions.delete(fileId);
  } catch (err: any) {
    logger.warn('Falha ao registrar versão/mudança documental', { fileId, error: err?.message });
  }
}

async function processStructure(doc: any, signal: AbortSignal): Promise<void> {
  const ext = (doc.extension || '').toLowerCase();
  
  // Tabular Formats -> Unified Importer
  const tabularExtensions = new Set(['.xlsx', '.xls', '.csv', '.tsv', '.json', '.xml', '.html', '.htm']);
  if (tabularExtensions.has(ext)) {
    try {
      await importUnifiedStructured(doc.full_path, ext, doc.id, true);
    } catch (err: any) {
      logger.warn(`Erro ao processar arquivo tabular: ${doc.name}`, { error: err?.message });
    }
  }
  if (ext === '.docx') {
    try {
      const clsStmt = getDatabase()?.prepare('SELECT doc_type FROM files WHERE id = ?');
      if (!clsStmt) return;
      clsStmt.bind([doc.id]);
      let docType = '';
      if (clsStmt.step()) docType = String(clsStmt.getAsObject().doc_type || '');
      clsStmt.free();
      await processDocxIntelligently(doc.full_path, doc.id, docType);
    } catch (err: any) {
      logger.warn(`Erro ao processar DOCX: ${doc.name}`, { error: err.message });
    }
  }
}

async function processGlobalStage(stage: string, signal: AbortSignal): Promise<void> {
  if (stage === 'site_sync') {
    await runSiteAgentsSync({ reason: 'queue' });
    return;
  }

  const db = getDatabase();
  if (!db) return;

  const textDocs: { id: number; text: string; relations_computed: boolean; graph_computed: boolean }[] = [];
  const stmt = db.prepare(`
    SELECT f.id, f.relations_computed, f.graph_computed, dt.raw_text
    FROM files f
    JOIN document_text dt ON dt.file_id = f.id
    WHERE dt.status = 'done' AND dt.raw_text IS NOT NULL AND length(dt.raw_text) > 10
    ORDER BY dt.extracted_at ASC
  `);
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    textDocs.push({
      id: Number(row.id),
      text: String(row.raw_text).substring(0, 5000),
      relations_computed: Boolean(row.relations_computed),
      graph_computed: Boolean(row.graph_computed)
    });
  }
  stmt.free();

  switch (stage) {
    case 'relations':
      await handleRelationsStage(textDocs, signal);
      break;
    case 'clusters':
      await handleClustersStage(textDocs, signal);
      break;
    case 'knowledge':
      await handleKnowledgeStage(signal);
      break;
    case 'simulator':
      await handleSimulatorStage(textDocs, signal);
      break;
  }
}

async function handleRelationsStage(textDocs: { id: number; text: string; relations_computed: boolean }[], signal: AbortSignal): Promise<void> {
  const newDocs = textDocs.filter(d => !d.relations_computed);
  if (newDocs.length > 0 && textDocs.length >= 2) {
    await computeAllSimilarities(newDocs, textDocs);
    clearTfIdfCache();
    logger.info('Similaridades computadas', { newDocs: newDocs.length, totalDocs: textDocs.length });
  }
}

async function handleClustersStage(textDocs: { id: number; text: string }[], signal: AbortSignal): Promise<void> {
  if (textDocs.length >= 2) {
    generateClusters();
    logger.info('Clusters gerados');
  }
}

async function handleKnowledgeStage(signal: AbortSignal): Promise<void> {
  const kg = buildKnowledgeGraph();
  logger.info('Grafo de conhecimento construído', { nodes: kg.nodes, edges: kg.edges });
}

async function handleSimulatorStage(textDocs: { id: number; text: string }[], signal: AbortSignal): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  const categoriesToGenerate = ['crise', 'porta-voz', 'relacionamento', 'normativa_diretriz', 'geral'];
  const crisisDocs = textDocs.filter(d => {
    const f = db.prepare('SELECT doc_type FROM files WHERE id = ?');
    f.bind([d.id]);
    let docType = '';
    if (f.step()) docType = String(f.getAsObject().doc_type || '');
    f.free();
    return categoriesToGenerate.includes(docType);
  });

  if (crisisDocs.length > 0) {
    // Randomize to select different docs each time
    crisisDocs.sort(() => Math.random() - 0.5);
    const selected = crisisDocs.slice(0, 5);
    const scenario = await generateScenarioFromDocuments(selected.map(d => d.id));
    if (scenario) {
      const docType = (() => {
        const f = db.prepare('SELECT doc_type FROM files WHERE id = ?');
        f.bind([selected[0].id]);
        let t = 'geral';
        if (f.step()) t = String(f.getAsObject().doc_type || 'geral');
        f.free();
        return t;
      })();
      insertScenario({
        title: scenario.title,
        description: scenario.description,
        options: scenario.options,
        difficulty: scenario.difficulty || 'medio',
        category: scenario.category || docType,
        source: 'ai-docs',
      });
      logger.info('Cenário gerado automaticamente', { title: scenario.title });
    }
  }

  const existingTP = getTalkingPoints();
  if (existingTP.length < 5) {
    const sensitiveDocs = textDocs.slice(0, 3);
    for (const doc of sensitiveDocs) {
      try {
        const tp = await generateTalkingPoints(doc.text.substring(0, 1500));
        if (tp) {
          insertTalkingPoint({
            title: tp.title,
            category: tp.category,
            approved: tp.approved,
            restricted: tp.restricted,
            source: 'ai',
          });
        }
      } catch (err: any) {
        logger.warn('Erro ao gerar talking point', { error: err.message });
      }
    }
  }
}
