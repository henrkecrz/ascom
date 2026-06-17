import { SiteSnapshotInput, SiteAgentRunContext } from './types';
import { queryRows, scalarNumber, safeJson } from './dbUtils';

export async function documentChangeAgent(_context: SiteAgentRunContext): Promise<SiteSnapshotInput[]> {
  const recentChanges = queryRows<any>(`
    SELECT dce.*, f.name, f.doc_type, f.plan_section
    FROM document_change_events dce
    LEFT JOIN files f ON f.id = dce.file_id
    ORDER BY dce.detected_at DESC, dce.id DESC
    LIMIT 10
  `);
  const criticalCount = scalarNumber("SELECT COUNT(*) FROM document_change_events WHERE impact_level = 'critico' AND status != 'resolved'");
  const highCount = scalarNumber("SELECT COUNT(*) FROM document_change_events WHERE impact_level = 'alto' AND status != 'resolved'");
  const openAlerts = scalarNumber('SELECT COUNT(*) FROM document_change_alerts WHERE resolved = 0');
  const totalChanges = scalarNumber('SELECT COUNT(*) FROM document_change_events');

  const affectedModules = Array.from(new Set(recentChanges.flatMap((row) => safeJson(row.affected_modules, []))));
  const riskLevel = criticalCount > 0 ? 'critico' : highCount > 0 ? 'alto' : openAlerts > 0 ? 'medio' : 'baixo';
  const status = criticalCount > 0 ? 'critico' : highCount > 0 || openAlerts > 0 ? 'atencao' : totalChanges > 0 ? 'ok' : 'vazio';

  return [{
    area: 'essencial',
    page: 'mudancas',
    agent: 'documentChangeAgent',
    title: 'Mudanças documentais',
    summary: totalChanges === 0
      ? 'Ainda não há histórico de mudanças documentais registrado.'
      : `${totalChanges} mudança(s) registradas. ${criticalCount} crítica(s), ${highCount} alta(s) e ${openAlerts} alerta(s) aberto(s).`,
    status,
    priority: criticalCount > 0 ? 100 : highCount > 0 ? 80 : openAlerts > 0 ? 60 : 20,
    riskLevel: riskLevel as any,
    sourceCount: totalChanges,
    payload: {
      totalChanges,
      criticalCount,
      highCount,
      openAlerts,
      affectedModules,
      recentChanges,
      recommendedActions: criticalCount > 0
        ? ['Revisar mudanças críticas antes de usar documentos em resposta oficial.', 'Atualizar protocolos, calendário, galeria e relatórios afetados.']
        : highCount > 0
          ? ['Revisar mudanças relevantes e validar impactos na comunicação.']
          : ['Manter acompanhamento normal das alterações.'],
    },
  }];
}
