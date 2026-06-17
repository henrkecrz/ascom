import { getAllDocuments, updateDocumentText, updateDocumentSummary, updateFileClassification, updateFileEntities, insertClassificationFeedback, getDatabase, saveDatabase } from '../database';
import { extractText, isExtractable } from '../processors/textExtractor';
import { extractKeywords, generateSummary, extractTopics } from './nlpService';
import { computeAllSimilarities } from './similarity';
import { generateClusters } from './cluster';
import { classifyDocument, getDocTypeLabel } from './classifier';
import { classifyWithAI } from './aiClassifier';
import { extractEntities, serializeEntities } from './entityExtractor';
import { buildKnowledgeGraph } from './knowledgeGraph';
import { importXlsxStructured } from '../processors/xlsxIntelligentImporter';
import { processDocxIntelligently } from '../processors/docxStructureExtractor';
import { logger } from '../lib/logger';
import { AI_CLASSIFY_TEXT_LIMIT } from '../shared/constants';

export async function runAnalysis(): Promise<void> {
  logger.info('Iniciando análise completa dos documentos');

  const docs = getAllDocuments();
  logger.info('Documentos encontrados', { count: docs.length });

  const textDocs: { id: number; text: string }[] = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    if (!doc.extension || !isExtractable(doc.extension)) {
      updateDocumentText(doc.id, '', 'skipped');
      continue;
    }

    process.stdout.write(`[${i + 1}/${docs.length}] Extraindo: ${doc.name}... `);

    try {
      const text = await extractText(doc.full_path, doc.extension);
      updateDocumentText(doc.id, text, text ? 'done' : 'empty');

      if (text && text.length > 10) {
        textDocs.push({ id: doc.id, text });

        const keywords = extractKeywords(text);
        const summary = generateSummary(text);
        const topics = extractTopics(text);

        updateDocumentSummary(
          doc.id,
          summary,
          keywords.join(', '),
          topics.join(', '),
          text.split(/\s+/).length
        );

        const cls = await classifyWithAI(doc.name, text, doc.category);
        updateFileClassification(doc.id, cls.docType, cls.confidence, cls.planSection);

        const entities = extractEntities(text);
        updateFileEntities(doc.id, serializeEntities(entities));

        const ext = (doc.extension || '').toLowerCase();
        let extraInfo = '';

        if (ext === '.xlsx' || ext === '.xls') {
          try {
            const importResult = await importXlsxStructured(doc.full_path, doc.id, true);
            extraInfo = ` | XLSX: ${importResult.importedRows} linhas, ${importResult.contactsCreated} contatos`;
          } catch {}
        }

        if (ext === '.docx') {
          try {
            const docxResult = await processDocxIntelligently(doc.full_path, doc.id, cls.docType);
            extraInfo = ` | DOCX: ${docxResult.sectionsCount} seções, ${docxResult.tablesImported} tabelas`;
          } catch {}
        }

        logger.debug(`[${i+1}/${docs.length}] ${doc.name}`, { words: text.split(/\s+/).length, type: getDocTypeLabel(cls.docType), extra: extraInfo });

        if (i % 5 === 0 || (ext === '.xlsx' || ext === '.xls' || ext === '.docx')) saveDatabase();
      } else {
        const cls = await classifyWithAI(doc.name, '', doc.category);
        updateFileClassification(doc.id, cls.docType, cls.confidence, cls.planSection);

        updateDocumentSummary(doc.id, '', '', '', 0);
        logger.debug(`[${i+1}/${docs.length}] ${doc.name} sem conteúdo`);
      }
    } catch (e) {
      updateDocumentText(doc.id, '', 'error');
      logger.warn(`Erro ao processar ${doc.name}`, { id: doc.id, error: (e as Error)?.message });
    }
  }

  logger.info('Extrações concluídas', { comTexto: textDocs.length });

  if (textDocs.length >= 2) {
    await computeAllSimilarities(textDocs, textDocs);
    generateClusters();
  }

  const kg = buildKnowledgeGraph();
  logger.info('Grafo de conhecimento construído', { nodes: kg.nodes, edges: kg.edges });

  logger.info('Análise completa!');
}

export async function reclassifyAndLearn(
  fileId: number,
  newType: string,
  newSection: string
): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  const stmt = db.prepare('SELECT doc_type FROM files WHERE id = ?');
  stmt.bind([fileId]);
  let originalType = '';
  if (stmt.step()) {
    originalType = String(stmt.getAsObject().doc_type || '');
  }
  stmt.free();

  const { reclassifyFile } = require('../database');
  reclassifyFile(fileId, newType, newSection);

  if (originalType && originalType !== newType) {
    insertClassificationFeedback({
      file_id: fileId,
      original_type: originalType,
      corrected_type: newType,
      corrected_by: 'user',
    });
    logger.info('Feedback salvo', { fileId, de: originalType, para: newType });
  }
}
