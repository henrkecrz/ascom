import { SiteAgentHandler } from './types';
import { pct, queryRows, scalarNumber } from './dbUtils';

export const essentialOverviewAgent: SiteAgentHandler = async () => {
  const totalDocuments = scalarNumber('SELECT COUNT(*) FROM files');
  const documentsWithText = scalarNumber("SELECT COUNT(*) FROM document_text WHERE status = 'done'");
  const importedTables = scalarNumber("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const highRisk = scalarNumber("SELECT COUNT(*) FROM queue_agent_logs WHERE agent = 'riskQueueAgent' AND risk_level IN ('alto', 'critico')");
  const lowConfidence = scalarNumber("SELECT COUNT(*) FROM files WHERE doc_type_confidence > 0 AND doc_type_confidence < 0.6");
  const recentDocuments = queryRows<any>(`
    SELECT id, name, extension, doc_type, last_modified
    FROM files
    ORDER BY last_modified DESC
    LIMIT 8
  `).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    extension: String(row.extension || ''),
    docType: String(row.doc_type || 'outro'),
    lastModified: String(row.last_modified || ''),
  }));

  const extractionRate = pct(documentsWithText, totalDocuments);
  const status = highRisk > 0 ? 'atencao' : extractionRate < 50 ? 'atencao' : 'ok';

  const priorityCards = [
    highRisk > 0 ? `Revisar ${highRisk} documento(s) com risco alto ou crítico` : 'Nenhum risco alto ou crítico pendente identificado',
    lowConfidence > 0 ? `Revisar ${lowConfidence} classificação(ões) com baixa confiança` : 'Classificações sem alerta relevante',
    extractionRate < 80 ? `Melhorar extração de texto: ${extractionRate}% da base processada` : `Base textual bem processada: ${extractionRate}%`,
  ];

  return [{
    area: 'essencial',
    page: 'dashboard',
    agent: 'essentialOverviewAgent',
    title: 'Visão geral inteligente',
    summary: `Base com ${totalDocuments} documentos, ${documentsWithText} com texto extraído (${extractionRate}%) e ${highRisk} alerta(s) de risco alto/crítico.`,
    status,
    priority: highRisk > 0 ? 90 : 60,
    riskLevel: highRisk > 0 ? 'alto' : 'baixo',
    sourceCount: totalDocuments,
    payload: {
      totalDocuments,
      documentsWithText,
      extractionRate,
      importedTables,
      highRisk,
      lowConfidence,
      recentDocuments,
      priorityCards,
      recommendedActions: priorityCards,
    },
  }];
};
