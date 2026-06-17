import { crisisReadinessAgent } from './crisisReadinessAgent';
import { dataQualityAgent } from './dataQualityAgent';
import { draftPreparationAgent } from './draftPreparationAgent';
import { essentialAlertsAgent } from './essentialAlertsAgent';
import { essentialOverviewAgent } from './essentialOverviewAgent';
import { graphEnrichmentAgent } from './graphEnrichmentAgent';
import { planCoverageAgent } from './planCoverageAgent';
import { SiteAgentDefinition } from './types';

export const siteAgentRegistry: SiteAgentDefinition[] = [
  {
    id: 'essentialOverviewAgent',
    label: 'Visão geral essencial',
    area: 'essencial',
    pages: ['dashboard'],
    handler: essentialOverviewAgent,
  },
  {
    id: 'essentialAlertsAgent',
    label: 'Alertas essenciais',
    area: 'essencial',
    pages: ['dashboard'],
    handler: essentialAlertsAgent,
  },
  {
    id: 'crisisReadinessAgent',
    label: 'Prontidão de crise',
    area: 'essencial',
    pages: ['crisis'],
    handler: crisisReadinessAgent,
  },
  {
    id: 'draftPreparationAgent',
    label: 'Preparação de rascunhos',
    area: 'ferramentas',
    pages: ['generator'],
    handler: draftPreparationAgent,
  },
  {
    id: 'dataQualityAgent',
    label: 'Qualidade da base',
    area: 'dados',
    pages: ['health', 'document-structure'],
    handler: dataQualityAgent,
  },
  {
    id: 'graphEnrichmentAgent',
    label: 'Enriquecimento do grafo',
    area: 'dados',
    pages: ['graph'],
    handler: graphEnrichmentAgent,
  },
  {
    id: 'planCoverageAgent',
    label: 'Cobertura do plano',
    area: 'dados',
    pages: ['plan'],
    handler: planCoverageAgent,
  },
];

export function listSiteAgents() {
  return siteAgentRegistry.map((agent) => ({
    id: agent.id,
    label: agent.label,
    area: agent.area,
    pages: agent.pages,
  }));
}

export function getSiteAgents(ids?: string[]): SiteAgentDefinition[] {
  if (!ids || ids.length === 0) return siteAgentRegistry;
  const wanted = new Set(ids);
  return siteAgentRegistry.filter((agent) => wanted.has(agent.id));
}
