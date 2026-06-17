import { calendarIntelligenceAgent } from './calendarIntelligenceAgent';
import { crisisReadinessAgent } from './crisisReadinessAgent';
import { dataQualityAgent } from './dataQualityAgent';
import { documentChangeAgent } from './documentChangeAgent';
import { draftPreparationAgent } from './draftPreparationAgent';
import { essentialAlertsAgent } from './essentialAlertsAgent';
import { essentialOverviewAgent } from './essentialOverviewAgent';
import { galleryContextAgent } from './galleryContextAgent';
import { graphEnrichmentAgent } from './graphEnrichmentAgent';
import { planCoverageAgent } from './planCoverageAgent';
import { sourceSyncAgent } from './sourceSyncAgent';
import { logReviewAgent } from './logReviewAgent';
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
    id: 'documentChangeAgent',
    label: 'Mudanças documentais',
    area: 'essencial',
    pages: ['mudancas', 'dashboard'],
    handler: documentChangeAgent,
  },
  {
    id: 'sourceSyncAgent',
    label: 'Sincronização das fontes',
    area: 'essencial',
    pages: ['fontes', 'dashboard'],
    handler: sourceSyncAgent,
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
    id: 'calendarIntelligenceAgent',
    label: 'Calendário inteligente',
    area: 'ferramentas',
    pages: ['calendario'],
    handler: calendarIntelligenceAgent,
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
  {
    id: 'galleryContextAgent',
    label: 'Galeria inteligente',
    area: 'dados',
    pages: ['galeria'],
    handler: galleryContextAgent,
  },
  {
    id: 'logReviewAgent',
    label: 'Revisor de logs e fila',
    area: 'dados',
    pages: ['dashboard', 'health'],
    handler: logReviewAgent,
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
