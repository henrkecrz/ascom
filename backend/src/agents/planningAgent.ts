import { generateWorkloadSummary } from '../analysis/workloadAdvisor';
import { AgentRequest, AgentResponse } from './types';

export async function planningAgent(request: AgentRequest): Promise<AgentResponse> {
  const year = request.context?.year || new Date().getFullYear();
  const summary = generateWorkloadSummary(year);

  const monthLines = summary.months
    .filter((month) => month.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((month) => `- **${month.name}**: ${month.total} documentos, ${month.remaining} dia(s) pendente(s), densidade ${month.density} docs/dia`);

  const recommendationLines = summary.recommendations
    .slice(0, 5)
    .map((rec) => `- **${rec.title}:** ${rec.description}`);

  return {
    agent: 'planning_agent',
    title: 'Agente de Planejamento',
    answer: `## Resumo ${year}\n\nDocumentos: **${summary.totalDocuments}**\nExtraídos: **${summary.extracted}**\nRestantes: **${summary.remaining}**\nTaxa de conclusão: **${summary.completionRate}%**\nMês prioritário: **${summary.topPriorityMonth}**\n\n## Meses com maior volume\n\n${monthLines.join('\n') || 'Nenhum mês com documentos encontrado.'}\n\n## Recomendações\n\n${recommendationLines.join('\n') || 'Nenhuma recomendação gerada.'}`,
    confidence: summary.totalDocuments > 0 ? 0.8 : 0.45,
    sources: ['workloadAdvisor'],
    recommendedActions: summary.recommendations.slice(0, 5).map((rec) => rec.action || rec.title),
    metadata: {
      year,
      summary,
    },
  };
}
