import { logger } from '../lib/logger';
import { runSiteAgentsSync } from './siteAgentOrchestrator';

let siteSyncInterval: any = null;
let isSiteSyncRunning = false;

export function startSiteSyncWorker(intervalMs: number = 10 * 60 * 1000): void {
  if (siteSyncInterval) return;
  logger.info('Iniciando worker de atualização dos Site Agents', { intervalMs });
  siteSyncInterval = setInterval(runSafeSiteSync, intervalMs);
  setTimeout(runSafeSiteSync, 15000);
}

export function stopSiteSyncWorker(): void {
  if (siteSyncInterval) {
    clearInterval(siteSyncInterval);
    siteSyncInterval = null;
  }
  isSiteSyncRunning = false;
  logger.info('Worker de Site Agents parado');
}

export function isSiteSyncWorkerRunning(): boolean {
  return isSiteSyncRunning;
}

export async function runSafeSiteSync(reason: 'worker' | 'queue' | 'manual' | 'startup' = 'worker') {
  if (isSiteSyncRunning) return null;
  isSiteSyncRunning = true;
  try {
    const result = await runSiteAgentsSync({ reason });
    logger.info('Site Agents sincronizados', result);
    return result;
  } catch (err: any) {
    logger.error('Falha ao sincronizar Site Agents', { error: err.message });
    return null;
  } finally {
    isSiteSyncRunning = false;
  }
}
