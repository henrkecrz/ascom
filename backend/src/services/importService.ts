import { getAllDataSources } from '../db/dataSources';
import { previewDataSource, importFile, getImportStatus } from '../analysis/smartImporter';
import { getDynamicTables } from '../analysis/dynamicTableGenerator';
import { getValidatedRelationships } from '../analysis/relationshipFinder';
import { logger } from '../lib/logger';

export async function previewImport(sourceId: string | number) {
  const sources = getAllDataSources(true);
  const numId = typeof sourceId === 'string' ? parseInt(sourceId, 10) : sourceId;
  const source = sources.find(s => s.id === numId);
  if (!source) throw new Error('Fonte não encontrada');

  logger.info(`Preview da fonte: ${source.label} (${source.path})`);
  const previews = await previewDataSource(source.path, source.label);

  return {
    sourceId: source.id,
    sourceLabel: source.label,
    sourcePath: source.path,
    totalFiles: previews.length,
    previews,
  };
}

export async function confirmImport(sourceId: string | number, fileIndices?: number[], schemaOverrides?: any[]) {
  const sources = getAllDataSources(true);
  const numId = typeof sourceId === 'string' ? parseInt(sourceId, 10) : sourceId;
  const source = sources.find(s => s.id === numId);
  if (!source) throw new Error('Fonte não encontrada');

  const previews = await previewDataSource(source.path, source.label);
  const toImport = fileIndices
    ? previews.filter((_, i) => fileIndices.includes(i))
    : previews;

  if (toImport.length === 0) throw new Error('Nenhum arquivo selecionado');

  const results = [];
  for (let i = 0; i < toImport.length; i++) {
    const item = toImport[i];
    try {
      // Find matching override index if fileIndices was provided
      let customSchema = undefined;
      if (schemaOverrides && schemaOverrides.length > 0) {
        const originalIndex = fileIndices ? fileIndices[i] : i;
        if (schemaOverrides[i] !== null) {
            // Apply override on top of the base schema
            customSchema = {
                ...item.schema,
                columns: schemaOverrides[i].columns
            };
        }
      }

      const result = await importFile(item.filePath, item.fileId, numId, customSchema as any);
      results.push({
        fileName: item.fileName,
        success: result.success,
        tableName: result.tableName,
        rowsInserted: result.rowsInserted,
        relationshipsFound: result.relationships.length,
        error: result.error,
      });
    } catch (err: any) {
      results.push({ fileName: item.fileName, success: false, error: err.message });
    }
  }

  return {
    sourceId,
    totalFiles: toImport.length,
    importedSuccessfully: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}


export function getTables() {
  return getDynamicTables();
}

export function getRelationships() {
  return getValidatedRelationships();
}

export function getJobStatus(jobId: string) {
  const status = getImportStatus(jobId);
  if (!status) return null;
  return status;
}

import { getImportHistory, getImportHistoryById, markImportUndone, getDatabase, scheduleSave } from '../database';

export function getImportHistoryList() {
  return getImportHistory(50);
}

export function undoImportTask(historyId: number) {
  const history = getImportHistoryById(historyId);
  if (!history || history.status === 'undone') {
    throw new Error('Histórico não encontrado ou já desfeito.');
  }

  const db = getDatabase();
  if (!db) throw new Error('Banco de dados não disponível');

  if (history.table_name === 'structured_data') {
     db.run('DELETE FROM structured_data WHERE source_file_id = ?', [history.file_id]);
  } else {
     db.run(`DELETE FROM "${history.table_name}" WHERE source_file_id = ?`, [history.file_id]);
  }
  
  markImportUndone(historyId);
  scheduleSave();
  return { success: true };
}
