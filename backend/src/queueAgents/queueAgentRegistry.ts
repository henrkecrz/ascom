import { analyzeQueueAgent } from './analyzeQueueAgent';
import { clusterQueueAgent } from './clusterQueueAgent';
import { extractQueueAgent } from './extractQueueAgent';
import { knowledgeQueueAgent } from './knowledgeQueueAgent';
import { relationQueueAgent } from './relationQueueAgent';
import { riskQueueAgent } from './riskQueueAgent';
import { simulatorQueueAgent } from './simulatorQueueAgent';
import { siteSyncQueueAgent } from './siteSyncQueueAgent';
import { structureQueueAgent } from './structureQueueAgent';
import { QueueAgentHandler, QueueAgentStage } from './types';

export const queueAgentRegistry: Record<QueueAgentStage, QueueAgentHandler> = {
  extract: extractQueueAgent,
  analyze: analyzeQueueAgent,
  structure: structureQueueAgent,
  relations: relationQueueAgent,
  clusters: clusterQueueAgent,
  knowledge: knowledgeQueueAgent,
  risk: riskQueueAgent,
  simulator: simulatorQueueAgent,
  site_sync: siteSyncQueueAgent,
};

export function getQueueAgent(stage: QueueAgentStage): QueueAgentHandler | null {
  return queueAgentRegistry[stage] || null;
}

export function listQueueAgents() {
  return Object.keys(queueAgentRegistry).map((stage) => ({
    stage,
    agent: getQueueAgentName(stage as QueueAgentStage),
  }));
}

export function getQueueAgentName(stage: QueueAgentStage): string {
  const names: Record<QueueAgentStage, string> = {
    extract: 'extractQueueAgent',
    analyze: 'analyzeQueueAgent',
    structure: 'structureQueueAgent',
    relations: 'relationQueueAgent',
    clusters: 'clusterQueueAgent',
    knowledge: 'knowledgeQueueAgent',
    risk: 'riskQueueAgent',
    simulator: 'simulatorQueueAgent',
    site_sync: 'siteSyncQueueAgent',
  };
  return names[stage];
}
