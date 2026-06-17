import { SiteSnapshotInput, SiteAgentRunContext } from './types';
import { queryRows, scalarNumber } from './dbUtils';

export async function sourceSyncAgent(_context: SiteAgentRunContext): Promise<SiteSnapshotInput[]> {
  const totalSources = scalarNumber('SELECT COUNT(*) FROM data_sources');
  const activeSources = scalarNumber('SELECT COUNT(*) FROM data_sources WHERE active = 1');
  const offlineScans = queryRows<any>('SELECT * FROM scan_log WHERE online = 0 ORDER BY scanned_at DESC LIMIT 10');
  const recentScans = queryRows<any>('SELECT * FROM scan_log ORDER BY scanned_at DESC LIMIT 10');
  const removedRecent = scalarNumber("SELECT COALESCE(SUM(removed_count), 0) FROM scan_log WHERE scanned_at >= datetime('now', '-7 days')");
  const modifiedRecent = scalarNumber("SELECT COALESCE(SUM(modified_count), 0) FROM scan_log WHERE scanned_at >= datetime('now', '-7 days')");
  const sourceStateCount = scalarNumber('SELECT COUNT(*) FROM source_file_state');

  const status = offlineScans.length > 0 || removedRecent > 20 ? 'atencao' : activeSources > 0 ? 'ok' : 'vazio';

  return [{
    area: 'essencial',
    page: 'fontes',
    agent: 'sourceSyncAgent',
    title: 'Sincronização das fontes',
    summary: `${activeSources}/${totalSources} fonte(s) ativa(s). ${modifiedRecent} arquivo(s) modificado(s) e ${removedRecent} removido(s) nos últimos 7 dias.`,
    status,
    priority: offlineScans.length > 0 ? 80 : removedRecent > 20 ? 70 : 20,
    riskLevel: offlineScans.length > 0 ? 'alto' : removedRecent > 20 ? 'medio' : 'baixo',
    sourceCount: sourceStateCount,
    payload: {
      totalSources,
      activeSources,
      offlineScans,
      recentScans,
      removedRecent,
      modifiedRecent,
      sourceStateCount,
      recommendedActions: [
        offlineScans.length > 0 ? 'Verificar fontes offline ou caminhos inacessíveis.' : 'Manter scanner automático ativo.',
        removedRecent > 20 ? 'Revisar remoções em massa antes de considerar exclusão definitiva.' : 'Acompanhar alterações normalmente.',
      ],
    },
  }];
}
