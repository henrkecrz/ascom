import { getTalkingPoints } from '../database';
import { processQuestion } from '../services/consultService';
import { AgentRequest, AgentResponse } from './types';

export async function spokespersonAgent(request: AgentRequest): Promise<AgentResponse> {
  const consult = await processQuestion(`Porta-voz, falas autorizadas e restrições para: ${request.question}`);
  const category = request.context?.category;
  const talkingPoints = getTalkingPoints(category).slice(0, 5);

  const pointsText = talkingPoints.length > 0
    ? talkingPoints.map((tp) => `### ${tp.title}\n\n**Pode falar:**\n${tp.approved.map((item) => `- ${item}`).join('\n')}\n\n**Evitar:**\n${tp.restricted.map((item) => `- ${item}`).join('\n')}`).join('\n\n')
    : 'Nenhum talking point específico encontrado para esta categoria.';

  return {
    agent: 'spokesperson_agent',
    title: 'Agente Porta-Voz',
    answer: `## Orientação de porta-voz\n\n${consult.answer}\n\n## Matriz de fala disponível\n\n${pointsText}`,
    confidence: consult.documents?.length || talkingPoints.length ? 0.78 : 0.5,
    documents: (consult.documents || []).slice(0, 10).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      docType: doc.docType,
      planSection: doc.planSection,
      summary: doc.summary,
    })),
    sources: ['consultService', 'talking_points_matrix', consult.source].filter(Boolean),
    recommendedActions: [
      'Definir porta-voz autorizado antes de falar com a imprensa',
      'Usar frases factuais e evitar especulações',
      'Validar assuntos sensíveis com diretoria e jurídico quando necessário',
    ],
    metadata: {
      talkingPointsCount: talkingPoints.length,
      consultIntent: consult.intent,
    },
  };
}
