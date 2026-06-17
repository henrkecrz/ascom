export type QueueAgentStage =
  | 'extract'
  | 'analyze'
  | 'structure'
  | 'relations'
  | 'clusters'
  | 'knowledge'
  | 'risk'
  | 'simulator';

export type QueueAgentStatus = 'done' | 'skipped' | 'error';
export type QueueRiskLevel = 'baixo' | 'medio' | 'alto' | 'critico';

export interface QueueAgentJob {
  id: number;
  fileId: number;
  stage: QueueAgentStage;
  fileName?: string;
  payload?: Record<string, any>;
}

export interface QueueAgentContext {
  file?: any;
  signal?: AbortSignal;
  [key: string]: any;
}

export interface QueueAgentResult {
  agent: string;
  stage: QueueAgentStage;
  status: QueueAgentStatus;
  confidence?: number;
  riskLevel?: QueueRiskLevel;
  summary?: string;
  recommendedAction?: string;
  metadata?: Record<string, any>;
}

export type QueueAgentExecutor = () => Promise<void>;
export type QueueAgentHandler = (
  job: QueueAgentJob,
  context: QueueAgentContext,
  executor: QueueAgentExecutor
) => Promise<QueueAgentResult[]>;
