import { processQuestion } from '../services/consultService';
import { AgentRequest, AgentResponse } from './types';
import { riskAgent } from './riskAgent';

function mapDocuments(docs: any[] = []) {
  return docs.slice(0, 10).map((doc) => ({
    id: doc.id,
    name: doc.name,
    docType: doc.docType,
    planSection: doc.planSection,
    summary: doc.summary,
  }));
}

export async function crisisAgent(request: AgentRequest): Promise<AgentResponse> {
  const consult = await processQuestion(`Protocolo de crise, porta-voz e ações recomendadas para: ${request.question}`);
  const risk = await riskAgent(request);

  return {
    agent: 'crisis_agent',
    title: 'Agente de Crise',
    answer: `## Diagnóstico inicial\n\n${risk.answer}\n\n## Orientação documental\n\n${consult.answer}`,
    confidence: consult.documents?.length ? 0.84 : 0.58,
    riskLevel: risk.riskLevel,
    documents: mapDocuments(consult.documents),
    sources: ['consultService', 'riskAgent', consult.source].filter(Boolean),
    recommendedActions: [
      ...(risk.recommendedActions || []),
      'Confirmar fatos com a área responsável',
      'Registrar horários, fontes e decisões tomadas',
      'Usar apenas informações validadas institucionalmente',
    ],
    metadata: {
      consultIntent: consult.intent,
      consultSource: consult.source,
      risk: risk.metadata,
    },
  };
}
