import { classifyWithAI } from '../analysis/aiClassifier';
import { AgentRequest, AgentResponse } from './types';

export async function classifierAgent(request: AgentRequest): Promise<AgentResponse> {
  const name = request.context?.fileName || request.question;
  const text = request.context?.text || request.question;
  const category = request.context?.category || 'Geral';

  const classification = await classifyWithAI(name, text, category);

  return {
    agent: 'classifier_agent',
    title: 'Agente Classificador',
    answer: `Classificação sugerida: **${classification.docType}**\n\nSeção indicada: **${classification.planSection}**\n\nConfiança: **${Math.round(classification.confidence * 100)}%**`,
    confidence: classification.confidence,
    recommendedActions: classification.confidence < 0.6
      ? ['Revisar manualmente a classificação', 'Adicionar palavras-chave ou categoria ao documento']
      : ['Usar a classificação sugerida no fluxo documental'],
    metadata: {
      docType: classification.docType,
      planSection: classification.planSection,
      source: classification.source,
    },
  };
}
