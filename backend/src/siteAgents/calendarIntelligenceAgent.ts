import { SiteSnapshotInput, SiteAgentRunContext } from './types';
import { queryRows, scalarNumber } from './dbUtils';

export async function calendarIntelligenceAgent(_context: SiteAgentRunContext): Promise<SiteSnapshotInput[]> {
  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);
  const documentsThisMonth = scalarNumber("SELECT COUNT(*) FROM files WHERE substr(last_modified, 1, 7) = ?", [monthPrefix]);
  const photosThisMonth = scalarNumber("SELECT COUNT(*) FROM photo_events WHERE substr(event_date, 1, 7) = ?", [monthPrefix]);
  const changesThisMonth = scalarNumber("SELECT COUNT(*) FROM document_change_events WHERE substr(detected_at, 1, 7) = ?", [monthPrefix]);
  const pendingDays = queryRows<any>(`
    SELECT substr(last_modified, 1, 10) as day, COUNT(*) as documents
    FROM files
    WHERE last_modified IS NOT NULL AND length(last_modified) >= 10
    GROUP BY substr(last_modified, 1, 10)
    HAVING day NOT IN (SELECT check_date FROM calendar_checks)
    ORDER BY documents DESC
    LIMIT 10
  `);
  const criticalDays = queryRows<any>(`
    SELECT substr(detected_at, 1, 10) as day, COUNT(*) as changes
    FROM document_change_events
    WHERE impact_level IN ('alto', 'critico')
    GROUP BY substr(detected_at, 1, 10)
    ORDER BY changes DESC
    LIMIT 10
  `);
  const opportunities = queryRows<any>('SELECT * FROM calendar_content_opportunities ORDER BY opportunity_date DESC, priority DESC LIMIT 10');
  const status = criticalDays.length > 0 ? 'atencao' : pendingDays.length > 0 ? 'atencao' : documentsThisMonth > 0 ? 'ok' : 'vazio';

  return [{
    area: 'ferramentas',
    page: 'calendario',
    agent: 'calendarIntelligenceAgent',
    title: 'Calendário inteligente',
    summary: `${documentsThisMonth} documento(s), ${photosThisMonth} evento(s) fotográfico(s) e ${changesThisMonth} mudança(s) neste mês.`,
    status,
    priority: criticalDays.length > 0 ? 80 : pendingDays.length > 0 ? 60 : 20,
    riskLevel: criticalDays.length > 0 ? 'alto' : pendingDays.length > 0 ? 'medio' : 'baixo',
    sourceCount: documentsThisMonth + photosThisMonth + changesThisMonth,
    payload: {
      month: monthPrefix,
      documentsThisMonth,
      photosThisMonth,
      changesThisMonth,
      pendingDays,
      criticalDays,
      opportunities,
      recommendedActions: [
        pendingDays.length > 0 ? 'Revisar dias pendentes no calendário.' : 'Manter calendário atualizado.',
        criticalDays.length > 0 ? 'Avaliar mudanças documentais relevantes por data.' : 'Monitorar novas mudanças por período.',
        photosThisMonth > 0 ? 'Cruzar eventos fotográficos com pautas do mês.' : 'Verificar se há fotos pendentes de indexação.',
      ],
    },
  }];
}
