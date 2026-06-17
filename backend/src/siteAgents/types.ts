export type SiteArea = 'essencial' | 'ferramentas' | 'dados';
export type SiteSnapshotStatus = 'ok' | 'atencao' | 'critico' | 'vazio';
export type SiteRiskLevel = 'baixo' | 'medio' | 'alto' | 'critico';

export interface SiteSnapshotInput {
  area: SiteArea;
  page: string;
  agent: string;
  title: string;
  summary: string;
  status: SiteSnapshotStatus;
  priority?: number;
  riskLevel?: SiteRiskLevel | null;
  payload?: Record<string, any>;
  sourceCount?: number;
}

export interface SiteSnapshot extends SiteSnapshotInput {
  id: number;
  updatedAt: string;
}

export interface SiteAgentRunContext {
  reason?: 'worker' | 'queue' | 'manual' | 'startup';
  requestedAgents?: string[];
  now?: Date;
}

export type SiteAgentHandler = (context: SiteAgentRunContext) => Promise<SiteSnapshotInput[]>;

export interface SiteAgentDefinition {
  id: string;
  label: string;
  area: SiteArea;
  pages: string[];
  handler: SiteAgentHandler;
}

export interface SiteAgentsRunResult {
  startedAt: string;
  finishedAt: string;
  reason: string;
  agentsRun: string[];
  snapshotsSaved: number;
  errors: { agent: string; message: string }[];
}
