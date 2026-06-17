import { AgentHandler, AgentId } from './types';
import { classifierAgent } from './classifierAgent';
import { contentAgent } from './contentAgent';
import { crisisAgent } from './crisisAgent';
import { dataAgent } from './dataAgent';
import { documentAgent } from './documentAgent';
import { graphAgent } from './graphAgent';
import { planningAgent } from './planningAgent';
import { riskAgent } from './riskAgent';
import { simulatorAgent } from './simulatorAgent';
import { spokespersonAgent } from './spokespersonAgent';

export const agentRegistry: Record<Exclude<AgentId, 'orchestrator'>, AgentHandler> = {
  document_agent: documentAgent,
  classifier_agent: classifierAgent,
  crisis_agent: crisisAgent,
  spokesperson_agent: spokespersonAgent,
  content_agent: contentAgent,
  data_agent: dataAgent,
  simulator_agent: simulatorAgent,
  graph_agent: graphAgent,
  planning_agent: planningAgent,
  risk_agent: riskAgent,
};

export function getAgent(agentId: AgentId): AgentHandler | null {
  if (agentId === 'orchestrator') return null;
  return agentRegistry[agentId] || null;
}

export function listAgents() {
  return Object.keys(agentRegistry).map((id) => ({
    id,
    label: getAgentLabel(id as AgentId),
  }));
}

export function getAgentLabel(agentId: AgentId): string {
  const labels: Record<AgentId, string> = {
    orchestrator: 'Orquestrador ASCOM',
    document_agent: 'Agente Documental',
    classifier_agent: 'Agente Classificador',
    crisis_agent: 'Agente de Crise',
    spokesperson_agent: 'Agente Porta-Voz',
    content_agent: 'Agente Gerador de Conteúdo',
    data_agent: 'Agente de Dados e Planilhas',
    simulator_agent: 'Agente de Simulação',
    graph_agent: 'Agente de Grafo e Relações',
    planning_agent: 'Agente de Planejamento',
    risk_agent: 'Agente de Risco Institucional',
  };
  return labels[agentId] || agentId;
}
