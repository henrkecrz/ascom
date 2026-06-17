import { generateScenarioFromDocuments, generateScenarios } from '../services/simulatorAi';
import { AgentRequest, AgentResponse } from './types';

export async function simulatorAgent(request: AgentRequest): Promise<AgentResponse> {
  const documentIds = request.context?.documentIds || [];
  const scenario = documentIds.length > 0
    ? await generateScenarioFromDocuments(documentIds)
    : (await generateScenarios(1, undefined, request.question))[0];

  if (!scenario) {
    return {
      agent: 'simulator_agent',
      title: 'Agente de Simulação',
      answer: 'Não foi possível gerar um cenário de simulação neste momento.',
      confidence: 0.35,
      recommendedActions: ['Tentar novamente com mais contexto', 'Informar o tipo de crise ou tema da simulação'],
      metadata: { generated: false },
    };
  }

  const options = scenario.options
    .map((option: any) => `**${option.id})** ${option.text}\nPontuação: ${option.points}\nFeedback: ${option.feedback}`)
    .join('\n\n');

  return {
    agent: 'simulator_agent',
    title: 'Agente de Simulação',
    answer: `## ${scenario.title}\n\n${scenario.description}\n\n**Dificuldade:** ${scenario.difficulty || 'medio'}\n**Categoria:** ${scenario.category || 'geral'}\n\n## Opções\n\n${options}`,
    confidence: 0.82,
    sources: [scenario.source || 'simulatorAi'],
    recommendedActions: [
      'Usar o cenário em treinamento interno',
      'Debater a opção mais adequada com a equipe',
      'Registrar aprendizados e atualizar protocolos se necessário',
    ],
    metadata: {
      scenario,
      generatedFromDocuments: documentIds.length > 0,
    },
  };
}
