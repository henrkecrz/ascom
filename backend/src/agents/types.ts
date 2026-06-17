export type AgentId =
  | 'orchestrator'
  | 'document_agent'
  | 'classifier_agent'
  | 'crisis_agent'
  | 'spokesperson_agent'
  | 'content_agent'
  | 'data_agent'
  | 'simulator_agent'
  | 'graph_agent'
  | 'planning_agent'
  | 'risk_agent';

export type RiskLevel = 'baixo' | 'medio' | 'alto' | 'critico';

export interface AgentContext {
  documentIds?: number[];
  fileId?: number;
  fileName?: string;
  text?: string;
  category?: string;
  year?: number;
  entity?: string;
  contentType?: 'release' | 'nota' | 'whatsapp' | 'instagram' | 'comunicado' | 'briefing';
  priority?: 'baixa' | 'normal' | 'alta' | 'urgente';
  [key: string]: any;
}

export interface AgentRequest {
  question: string;
  mode?: 'auto' | AgentId;
  context?: AgentContext;
}

export interface AgentDocumentRef {
  id?: number;
  name: string;
  docType?: string;
  planSection?: string;
  summary?: string;
}

export interface AgentResponse {
  agent: AgentId;
  title: string;
  answer: string;
  confidence: number;
  documents?: AgentDocumentRef[];
  sources?: string[];
  recommendedActions?: string[];
  riskLevel?: RiskLevel;
  metadata?: Record<string, any>;
}

export interface AgentExecutionPlan {
  intent: string;
  primaryAgent: AgentId;
  secondaryAgents: AgentId[];
  needsDocuments: boolean;
  needsRiskAnalysis: boolean;
  expectedOutput: string;
  confidence: number;
}

export type AgentHandler = (request: AgentRequest) => Promise<AgentResponse>;
