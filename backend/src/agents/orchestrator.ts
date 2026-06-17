import { AgentExecutionPlan, AgentId, AgentRequest, AgentResponse } from './types';
import { getAgent } from './registry';
import { callAgentLLM, parseJsonFromLLM } from './llmClient';

const VALID_AGENTS: AgentId[] = [
  'document_agent',
  'classifier_agent',
  'crisis_agent',
  'spokesperson_agent',
  'content_agent',
  'data_agent',
  'simulator_agent',
  'graph_agent',
  'planning_agent',
  'risk_agent',
];

function isValidAgent(agent: string): agent is AgentId {
  return VALID_AGENTS.includes(agent as AgentId);
}

function ruleBasedPlan(request: AgentRequest): AgentExecutionPlan {
  const q = request.question.toLowerCase();
  const mode = request.mode;

  if (mode && mode !== 'auto' && isValidAgent(mode)) {
    return {
      intent: 'manual_agent_selection',
      primaryAgent: mode,
      secondaryAgents: [],
      needsDocuments: ['document_agent', 'crisis_agent', 'spokesperson_agent', 'content_agent'].includes(mode),
      needsRiskAnalysis: ['crisis_agent', 'risk_agent'].includes(mode),
      expectedOutput: 'agent_response',
      confidence: 1,
    };
  }

  if (/crise|acidente|den[uú]ncia|imprensa|mat[eé]ria negativa|queda de [aá]rvore|desabamento|interdi[cç][aã]o|grave|fatal/.test(q)) {
    return {
      intent: 'crisis_response',
      primaryAgent: 'crisis_agent',
      secondaryAgents: ['risk_agent', 'spokesperson_agent', 'content_agent'],
      needsDocuments: true,
      needsRiskAnalysis: true,
      expectedOutput: 'orientacao_operacional',
      confidence: 0.86,
    };
  }

  if (/porta[- ]?voz|pode falar|deve falar|o que falar|evitar falar|talking points|fala oficial/.test(q)) {
    return {
      intent: 'spokesperson_guidance',
      primaryAgent: 'spokesperson_agent',
      secondaryAgents: ['risk_agent', 'document_agent'],
      needsDocuments: true,
      needsRiskAnalysis: true,
      expectedOutput: 'orientacao_de_fala',
      confidence: 0.82,
    };
  }

  if (/release|nota|legenda|instagram|whatsapp|comunicado|texto|resposta|briefing|publica[cç][aã]o/.test(q)) {
    return {
      intent: 'content_generation',
      primaryAgent: 'content_agent',
      secondaryAgents: ['document_agent', 'risk_agent'],
      needsDocuments: true,
      needsRiskAnalysis: /crise|sens[ií]vel|imprensa|den[uú]ncia/.test(q),
      expectedOutput: 'conteudo_pronto',
      confidence: 0.8,
    };
  }

  if (/planilha|dados|tabela|csv|xlsx|indicador|dashboard|importa[cç][aã]o|schema/.test(q)) {
    return {
      intent: 'data_analysis',
      primaryAgent: 'data_agent',
      secondaryAgents: ['document_agent'],
      needsDocuments: false,
      needsRiskAnalysis: false,
      expectedOutput: 'analise_de_dados',
      confidence: 0.78,
    };
  }

  if (/simula[cç][aã]o|treinamento|war game|cen[aá]rio|teste de crise|exerc[ií]cio/.test(q)) {
    return {
      intent: 'simulation',
      primaryAgent: 'simulator_agent',
      secondaryAgents: ['crisis_agent'],
      needsDocuments: Boolean(request.context?.documentIds?.length),
      needsRiskAnalysis: false,
      expectedOutput: 'cenario_de_treinamento',
      confidence: 0.79,
    };
  }

  if (/grafo|rela[cç][aã]o|relaciona|conect|cluster|entidade|v[ií]nculo/.test(q)) {
    return {
      intent: 'knowledge_graph',
      primaryAgent: 'graph_agent',
      secondaryAgents: ['document_agent'],
      needsDocuments: true,
      needsRiskAnalysis: false,
      expectedOutput: 'mapa_de_relacoes',
      confidence: 0.76,
    };
  }

  if (/planejamento|prioridade|m[eê]s|volume|demanda|ritmo|processamento|gargalo|calend[aá]rio/.test(q)) {
    return {
      intent: 'planning',
      primaryAgent: 'planning_agent',
      secondaryAgents: [],
      needsDocuments: false,
      needsRiskAnalysis: false,
      expectedOutput: 'recomendacoes_de_planejamento',
      confidence: 0.74,
    };
  }

  if (/classifica|tipo de documento|se[cç][aã]o|categoria/.test(q)) {
    return {
      intent: 'classification',
      primaryAgent: 'classifier_agent',
      secondaryAgents: [],
      needsDocuments: false,
      needsRiskAnalysis: false,
      expectedOutput: 'classificacao_documental',
      confidence: 0.72,
    };
  }

  return {
    intent: 'document_consultation',
    primaryAgent: 'document_agent',
    secondaryAgents: [],
    needsDocuments: true,
    needsRiskAnalysis: false,
    expectedOutput: 'resposta_documental',
    confidence: 0.68,
  };
}

async function llmPlan(request: AgentRequest): Promise<AgentExecutionPlan | null> {
  const raw = await callAgentLLM([
    {
      role: 'system',
      content: `Você é o Orquestrador ASCOM. Classifique a solicitação e escolha o melhor agente. Responda APENAS com JSON válido. Agentes disponíveis: ${VALID_AGENTS.join(', ')}. Formato: {"intent":"...","primaryAgent":"document_agent","secondaryAgents":[],"needsDocuments":true,"needsRiskAnalysis":false,"expectedOutput":"...","confidence":0.0}`,
    },
    {
      role: 'user',
      content: request.question,
    },
  ], { temperature: 0.1, maxTokens: 400, timeoutMs: 12000 });

  const parsed = parseJsonFromLLM<AgentExecutionPlan>(raw);
  if (!parsed || !isValidAgent(parsed.primaryAgent)) return null;

  const secondaryAgents = Array.isArray(parsed.secondaryAgents)
    ? parsed.secondaryAgents.filter((agent) => isValidAgent(agent))
    : [];

  return {
    intent: parsed.intent || 'unknown',
    primaryAgent: parsed.primaryAgent,
    secondaryAgents,
    needsDocuments: Boolean(parsed.needsDocuments),
    needsRiskAnalysis: Boolean(parsed.needsRiskAnalysis),
    expectedOutput: parsed.expectedOutput || 'agent_response',
    confidence: Math.min(Math.max(Number(parsed.confidence) || 0.5, 0), 1),
  };
}

function mergeResponses(plan: AgentExecutionPlan, primary: AgentResponse, secondary: AgentResponse[]): AgentResponse {
  if (secondary.length === 0) {
    return {
      ...primary,
      metadata: {
        ...(primary.metadata || {}),
        plan,
        agentsUsed: [primary.agent],
      },
    };
  }

  const secondaryText = secondary
    .map((response) => `## ${response.title}\n\n${response.answer}`)
    .join('\n\n');

  const recommendedActions = [
    ...(primary.recommendedActions || []),
    ...secondary.flatMap((response) => response.recommendedActions || []),
  ];

  const documents = [
    ...(primary.documents || []),
    ...secondary.flatMap((response) => response.documents || []),
  ];

  const sources = [
    ...(primary.sources || []),
    ...secondary.flatMap((response) => response.sources || []),
  ];

  return {
    ...primary,
    answer: `${primary.answer}\n\n---\n\n${secondaryText}`,
    confidence: Math.round(((primary.confidence + secondary.reduce((sum, response) => sum + response.confidence, 0)) / (secondary.length + 1)) * 100) / 100,
    documents: documents.slice(0, 15),
    sources: [...new Set(sources)],
    recommendedActions: [...new Set(recommendedActions)].slice(0, 12),
    riskLevel: primary.riskLevel || secondary.find((response) => response.riskLevel)?.riskLevel,
    metadata: {
      ...(primary.metadata || {}),
      plan,
      agentsUsed: [primary.agent, ...secondary.map((response) => response.agent)],
      secondary: secondary.map((response) => ({ agent: response.agent, confidence: response.confidence })),
    },
  };
}

export async function orchestrateAgents(request: AgentRequest): Promise<{ plan: AgentExecutionPlan; response: AgentResponse }> {
  const rulePlan = ruleBasedPlan(request);
  const useLLMPlanner = request.mode === 'auto' || !request.mode;
  const plan = useLLMPlanner ? (await llmPlan(request)) || rulePlan : rulePlan;

  const handler = getAgent(plan.primaryAgent);
  if (!handler) throw new Error(`Agente não encontrado: ${plan.primaryAgent}`);

  const primary = await handler(request);

  const secondaryAgents = plan.secondaryAgents
    .filter((agent) => agent !== plan.primaryAgent)
    .slice(0, 2);

  const secondary: AgentResponse[] = [];
  for (const agentId of secondaryAgents) {
    const secondaryHandler = getAgent(agentId);
    if (!secondaryHandler) continue;
    try {
      secondary.push(await secondaryHandler(request));
    } catch {
      // Falhas de agente secundário não devem impedir a resposta principal.
    }
  }

  return {
    plan,
    response: mergeResponses(plan, primary, secondary),
  };
}
