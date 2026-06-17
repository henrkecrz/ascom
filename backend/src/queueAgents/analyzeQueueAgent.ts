import { getDatabase } from '../database';
import { QueueAgentHandler, QueueAgentResult } from './types';

export const analyzeQueueAgent: QueueAgentHandler = async (job, _context, executor) => {
  await executor();

  const db = getDatabase();
  const results: QueueAgentResult[] = [];
  let docType = '';
  let planSection = '';
  let confidence = 0;
  let summary = '';
  let wordCount = 0;
  let entities = '';

  if (db && job.fileId > 0) {
    const fileStmt = db.prepare('SELECT doc_type, doc_type_confidence, plan_section, entities FROM files WHERE id = ?');
    fileStmt.bind([job.fileId]);
    if (fileStmt.step()) {
      const row = fileStmt.getAsObject() as any;
      docType = String(row.doc_type || '');
      planSection = String(row.plan_section || '');
      confidence = Number(row.doc_type_confidence || 0);
      entities = String(row.entities || '');
    }
    fileStmt.free();

    const summaryStmt = db.prepare('SELECT summary, word_count FROM document_summary WHERE file_id = ?');
    summaryStmt.bind([job.fileId]);
    if (summaryStmt.step()) {
      const row = summaryStmt.getAsObject() as any;
      summary = String(row.summary || '');
      wordCount = Number(row.word_count || 0);
    }
    summaryStmt.free();
  }

  results.push({
    agent: 'classifyQueueAgent',
    stage: 'analyze',
    status: 'done',
    confidence: confidence || 0.5,
    summary: docType ? `Documento classificado como ${docType}${planSection ? ` na seção ${planSection}` : ''}.` : 'Documento analisado sem classificação conclusiva.',
    recommendedAction: confidence < 0.6 ? 'Revisar classificação manualmente.' : 'Usar classificação no fluxo documental.',
    metadata: { docType, planSection, classificationConfidence: confidence },
  });

  results.push({
    agent: 'summaryQueueAgent',
    stage: 'analyze',
    status: summary ? 'done' : 'skipped',
    confidence: summary ? 0.78 : 0.35,
    summary: summary ? summary.substring(0, 500) : 'Resumo não gerado por falta de texto extraído.',
    recommendedAction: summary ? 'Resumo disponível para busca e consulta.' : 'Verificar extração de texto do documento.',
    metadata: { wordCount },
  });

  results.push({
    agent: 'entityQueueAgent',
    stage: 'analyze',
    status: entities ? 'done' : 'skipped',
    confidence: entities ? 0.72 : 0.35,
    summary: entities ? 'Entidades extraídas e salvas no documento.' : 'Nenhuma entidade relevante foi salva.',
    recommendedAction: entities ? 'Usar entidades para relações, busca e grafo.' : 'Revisar documento se entidades forem esperadas.',
    metadata: { hasEntities: Boolean(entities), entitiesPreview: entities.substring(0, 500) },
  });

  return results;
};
