import { getKnowledgeNetwork, getRelatedByEntity } from '../analysis/knowledgeGraph';
import { AgentRequest, AgentResponse } from './types';

function inferEntity(question: string): string {
  const quoted = question.match(/["“”']([^"“”']+)["“”']/);
  if (quoted?.[1]) return quoted[1];

  const tokens = question
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3);

  return tokens.slice(-2).join(' ');
}

export async function graphAgent(request: AgentRequest): Promise<AgentResponse> {
  const entity = request.context?.entity || inferEntity(request.question);
  const network = getKnowledgeNetwork();
  const related = entity ? getRelatedByEntity(entity).slice(0, 10) : [];

  const relatedText = related.length > 0
    ? related.map((item) => `- ${item.name} (${item.docType})`).join('\n')
    : 'Nenhum item diretamente relacionado à entidade informada foi encontrado.';

  return {
    agent: 'graph_agent',
    title: 'Agente de Grafo e Relações',
    answer: `O grafo de conhecimento possui **${network.nodes.length} nós** e **${network.edges.length} conexões**.\n\nEntidade consultada: **${entity || 'não informada'}**\n\n## Relações encontradas\n\n${relatedText}`,
    confidence: network.nodes.length > 0 ? 0.72 : 0.42,
    sources: ['knowledgeGraph', 'knowledge_relations'],
    recommendedActions: [
      'Abrir o grafo visual para navegar pelas conexões',
      'Consultar documentos relacionados antes de produzir resposta institucional',
      'Usar entidades específicas para melhorar a busca',
    ],
    metadata: {
      entity,
      nodes: network.nodes.length,
      edges: network.edges.length,
      relatedCount: related.length,
    },
  };
}
