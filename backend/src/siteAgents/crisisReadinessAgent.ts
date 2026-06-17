import { getTalkingPoints } from '../database';
import { SiteAgentHandler } from './types';
import { scalarNumber } from './dbUtils';

export const crisisReadinessAgent: SiteAgentHandler = async () => {
  const protocols = scalarNumber("SELECT COUNT(*) FROM files WHERE doc_type = 'protocolo_crise'");
  const spokespersons = scalarNumber("SELECT COUNT(*) FROM files WHERE doc_type = 'porta_voz'");
  const sensitiveDocs = scalarNumber("SELECT COUNT(*) FROM files WHERE doc_type = 'assunto_sensivel'");
  const highRisk = scalarNumber("SELECT COUNT(*) FROM queue_agent_logs WHERE agent = 'riskQueueAgent' AND risk_level IN ('alto', 'critico')");
  const recentProtocols = scalarNumber("SELECT COUNT(*) FROM files WHERE doc_type = 'protocolo_crise' AND date(last_modified) >= date('now', '-6 months')");
  const talkingPoints = getTalkingPoints().length;

  const score = Math.min(100,
    (protocols > 0 ? 30 : 0) +
    (spokespersons > 0 ? 20 : 0) +
    (sensitiveDocs > 0 || highRisk > 0 ? 20 : 0) +
    (talkingPoints > 0 ? 15 : 0) +
    (recentProtocols > 0 ? 15 : 0)
  );

  const status = score >= 80 ? 'ok' : score >= 50 ? 'atencao' : 'critico';
  const recommendations: string[] = [];
  if (protocols === 0) recommendations.push('Cadastrar ou classificar protocolos de crise.');
  if (spokespersons === 0) recommendations.push('Cadastrar porta-vozes por tema.');
  if (talkingPoints === 0) recommendations.push('Criar matriz de talking points.');
  if (recentProtocols === 0 && protocols > 0) recommendations.push('Atualizar protocolos de crise antigos.');
  if (highRisk > 0) recommendations.push('Revisar documentos com risco alto ou crítico.');
  if (recommendations.length === 0) recommendations.push('Manter revisão periódica dos documentos de crise.');

  return [{
    area: 'essencial',
    page: 'crisis',
    agent: 'crisisReadinessAgent',
    title: 'Prontidão de crise',
    summary: `Score de prontidão: ${score}/100. Protocolos: ${protocols}, porta-vozes: ${spokespersons}, talking points: ${talkingPoints}.`,
    status,
    priority: status === 'critico' ? 100 : status === 'atencao' ? 80 : 50,
    riskLevel: status === 'critico' ? 'critico' : status === 'atencao' ? 'alto' : 'baixo',
    sourceCount: protocols + spokespersons + sensitiveDocs + talkingPoints,
    payload: {
      score,
      protocols,
      spokespersons,
      sensitiveDocs,
      highRisk,
      recentProtocols,
      talkingPoints,
      recommendations,
      formula: {
        protocols: '30%',
        spokespersons: '20%',
        sensitiveDocs: '20%',
        talkingPoints: '15%',
        recentProtocols: '15%',
      },
    },
  }];
};
