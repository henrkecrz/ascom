import { SiteAgentHandler } from './types';
import { queryRows, scalarNumber } from './dbUtils';

export const essentialAlertsAgent: SiteAgentHandler = async () => {
  const alerts: any[] = [];

  const riskLogs = queryRows<any>(`
    SELECT file_id, risk_level, summary, recommended_action, created_at
    FROM queue_agent_logs
    WHERE agent = 'riskQueueAgent' AND risk_level IN ('alto', 'critico')
    ORDER BY created_at DESC
    LIMIT 10
  `);
  for (const row of riskLogs) {
    alerts.push({
      type: row.risk_level === 'critico' ? 'critical' : 'warning',
      category: 'risco_institucional',
      fileId: Number(row.file_id || 0),
      message: String(row.summary || 'Documento sensível identificado'),
      action: String(row.recommended_action || 'Validar antes de divulgar'),
    });
  }

  const missingText = scalarNumber(`
    SELECT COUNT(*) FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    WHERE dt.file_id IS NULL OR dt.status IN ('empty', 'error', 'skipped')
  `);
  if (missingText > 0) {
    alerts.push({ type: 'warning', category: 'sem_texto', message: `${missingText} documento(s) sem texto útil extraído`, action: 'Revisar extração ou OCR' });
  }

  const missingSummary = scalarNumber(`
    SELECT COUNT(*) FROM files f
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    WHERE ds.file_id IS NULL OR ds.summary IS NULL OR ds.summary = ''
  `);
  if (missingSummary > 0) {
    alerts.push({ type: 'info', category: 'sem_resumo', message: `${missingSummary} documento(s) sem resumo`, action: 'Reprocessar análise documental' });
  }

  const lowConfidence = scalarNumber('SELECT COUNT(*) FROM files WHERE doc_type_confidence > 0 AND doc_type_confidence < 0.6');
  if (lowConfidence > 0) {
    alerts.push({ type: 'info', category: 'baixa_confianca', message: `${lowConfidence} documento(s) com classificação de baixa confiança`, action: 'Revisar classificação manualmente' });
  }

  const oldProtocols = scalarNumber(`
    SELECT COUNT(*) FROM files
    WHERE doc_type = 'protocolo_crise' AND date(last_modified) < date('now', '-6 months')
  `);
  if (oldProtocols > 0) {
    alerts.push({ type: 'warning', category: 'protocolo_antigo', message: `${oldProtocols} protocolo(s) de crise sem atualização recente`, action: 'Validar vigência dos protocolos' });
  }

  const spokespersons = scalarNumber("SELECT COUNT(*) FROM files WHERE doc_type = 'porta_voz'");
  if (spokespersons === 0) {
    alerts.push({ type: 'critical', category: 'sem_porta_voz', message: 'Nenhum documento classificado como Porta-Voz encontrado', action: 'Cadastrar ou classificar documentos de porta-voz' });
  }

  const criticalCount = alerts.filter((alert) => alert.type === 'critical').length;
  const warningCount = alerts.filter((alert) => alert.type === 'warning').length;

  return [{
    area: 'essencial',
    page: 'dashboard',
    agent: 'essentialAlertsAgent',
    title: 'Alertas inteligentes',
    summary: alerts.length > 0 ? `${alerts.length} alerta(s) operacional(is) identificados.` : 'Nenhum alerta operacional relevante identificado.',
    status: criticalCount > 0 ? 'critico' : warningCount > 0 ? 'atencao' : 'ok',
    priority: criticalCount > 0 ? 100 : warningCount > 0 ? 80 : 30,
    riskLevel: criticalCount > 0 ? 'critico' : warningCount > 0 ? 'alto' : 'baixo',
    sourceCount: alerts.length,
    payload: {
      alerts,
      counts: { critical: criticalCount, warning: warningCount, total: alerts.length },
    },
  }];
};
