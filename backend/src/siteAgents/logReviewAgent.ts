import fs from 'fs';
import path from 'path';
import { SiteSnapshotInput, SiteAgentRunContext } from './types';
import { getDatabase, saveDatabase } from '../database';
import { logger } from '../lib/logger';

export async function logReviewAgent(context: SiteAgentRunContext): Promise<SiteSnapshotInput[]> {
  const db = getDatabase();
  if (!db) {
    return [];
  }

  const logsDir = path.join(process.cwd(), 'logs');
  const errorsFound: string[] = [];
  const parsedQueueFailures = new Set<number>();
  let logFileAnalyzed = '';

  // 1. Scan log files for errors and failed queue items
  try {
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir)
        .filter(f => f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(logsDir, f),
          mtime: fs.statSync(path.join(logsDir, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > 0) {
        const latestLog = files[0];
        logFileAnalyzed = latestLog.name;
        // Read the last 500KB of the file to prevent memory issues with massive logs
        const stats = fs.statSync(latestLog.path);
        const bufferSize = Math.min(stats.size, 500 * 1024);
        const buffer = Buffer.alloc(bufferSize);
        const fd = fs.openSync(latestLog.path, 'r');
        fs.readSync(fd, buffer, 0, bufferSize, stats.size - bufferSize);
        fs.closeSync(fd);

        const logContent = buffer.toString('utf8');

        // Regex patterns for logs
        const queueFailureRegex = /(?:Falha|Erro|Timeout) queue #(\d+)/gi;
        let match;
        while ((match = queueFailureRegex.exec(logContent)) !== null) {
          parsedQueueFailures.add(Number(match[1]));
        }

        // Search for specific service errors
        if (logContent.includes('fetch failed')) {
          errorsFound.push('Falha na conexão com o serviço externo (Python NLP ou LLM)');
        }
        if (logContent.includes('Invalid API key') || logContent.includes('AuthError')) {
          errorsFound.push('Erro de autenticação da LLM (chave inválida)');
        }
        if (logContent.includes('has no column named')) {
          errorsFound.push('Erro de esquema do banco de dados (coluna ausente)');
        }
        if (logContent.includes('table structured_data has no column named row_hash')) {
          errorsFound.push('Erro específico estruturado: coluna row_hash ausente na tabela structured_data');
        }
      }
    }
  } catch (err: any) {
    logger.warn('Erro ao ler arquivos de log no logReviewAgent', { error: err.message });
  }

  // 2. Query database for failed, dead letter, or stuck items
  const requeuedItems: any[] = [];
  try {
    // Collect all failed items (status 'error' or 'dead_letter')
    const failedQuery = db.prepare(`
      SELECT id, file_id, stage, status, error_message
      FROM processing_queue
      WHERE status IN ('error', 'dead_letter')
    `);
    const dbFailedItems: any[] = [];
    while (failedQuery.step()) {
      dbFailedItems.push(failedQuery.getAsObject());
    }
    failedQuery.free();

    // Stuck items: status 'processing' started more than 15 minutes ago
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const stuckQuery = db.prepare(`
      SELECT id, file_id, stage, status, 'Item travado no status processing' as error_message
      FROM processing_queue
      WHERE status = 'processing' AND started_at < ?
    `);
    stuckQuery.bind([fifteenMinutesAgo]);
    const dbStuckItems: any[] = [];
    while (stuckQuery.step()) {
      dbStuckItems.push(stuckQuery.getAsObject());
    }
    stuckQuery.free();

    // Combine all unique item IDs to requeue
    const itemsToRequeue = new Map<number, any>();
    
    // Add DB items
    for (const item of [...dbFailedItems, ...dbStuckItems]) {
      itemsToRequeue.set(Number(item.id), item);
    }

    // Add parsed log failures that are still in the queue but maybe not marked as error (or marked as error)
    if (parsedQueueFailures.size > 0) {
      const placeholders = Array.from(parsedQueueFailures).map(() => '?').join(',');
      const parsedQuery = db.prepare(`
        SELECT id, file_id, stage, status, error_message
        FROM processing_queue
        WHERE id IN (${placeholders})
      `);
      parsedQuery.bind(Array.from(parsedQueueFailures));
      while (parsedQuery.step()) {
        const item: any = parsedQuery.getAsObject();
        // Only requeue if not already done
        if (item.status !== 'done' && item.status !== 'skipped') {
          itemsToRequeue.set(Number(item.id), item);
        }
      }
      parsedQuery.free();
    }

    // 3. Requeue the items
    if (itemsToRequeue.size > 0) {
      const now = new Date().toISOString();
      for (const [id, item] of itemsToRequeue.entries()) {
        db.run(`
          UPDATE processing_queue
          SET status = 'pending',
              retry_count = 0,
              error_message = NULL,
              started_at = NULL,
              completed_at = NULL,
              created_at = ?
          WHERE id = ?
        `, [now, id]);

        // Get file name helper
        let fileName = `Global stage ${item.stage}`;
        if (Number(item.file_id) > 0) {
          const fileStmt = db.prepare('SELECT name FROM files WHERE id = ?');
          fileStmt.bind([item.file_id]);
          if (fileStmt.step()) {
            fileName = String(fileStmt.getAsObject().name);
          }
          fileStmt.free();
        }

        requeuedItems.push({
          id,
          fileId: item.file_id,
          fileName,
          stage: item.stage,
          previousStatus: item.status,
          errorMessage: item.error_message || 'Erro indeterminado'
        });
      }
      saveDatabase();
      logger.info(`Agente de logs reenfileirou ${requeuedItems.length} itens na fila de processamento.`);
    }
  } catch (dbErr: any) {
    logger.error('Erro ao manipular fila no logReviewAgent', { error: dbErr.message });
  }

  // 4. Determine status and priority
  const requeuedCount = requeuedItems.length;
  const status = errorsFound.length > 0 ? 'atencao' : requeuedCount > 0 ? 'atencao' : 'ok';
  const riskLevel = errorsFound.length > 0 ? 'medio' : 'baixo';

  const summary = requeuedCount > 0
    ? `Revisou logs e reenfileirou ${requeuedCount} item(ns) falho(s) ou travado(s).`
    : `Nenhuma falha pendente na fila de processamento.`;

  const recommendedActions: string[] = [];
  if (errorsFound.some(e => e.includes('conexão'))) {
    recommendedActions.push('Certifique-se de que o serviço Python de NLP (porta 8000) está rodando.');
  }
  if (errorsFound.some(e => e.includes('autenticação'))) {
    recommendedActions.push('Verifique as chaves de API nos perfis do OpenCode / DeepSeek.');
  }
  if (errorsFound.some(e => e.includes('row_hash'))) {
    recommendedActions.push('A migração de row_hash no SQLite falhou. Execute uma verificação de integridade do banco.');
  }
  if (requeuedCount > 0) {
    recommendedActions.push('Acompanhe a fila de processamento para garantir que os itens reenfileirados terminem com sucesso.');
  } else {
    recommendedActions.push('Monitoramento periódico de logs ativo.');
  }

  return [{
    area: 'dados',
    page: 'dashboard',
    agent: 'logReviewAgent',
    title: 'Revisor de logs e fila',
    summary,
    status,
    priority: requeuedCount > 0 ? 75 : 20,
    riskLevel: riskLevel as any,
    sourceCount: requeuedCount,
    payload: {
      logFileAnalyzed,
      errorsFound,
      requeuedCount,
      requeuedItems,
      recommendedActions
    }
  }];
}
