export interface BaseDocument {
  id: number;
  name: string;
  last_modified: string;
  size_formatted: string;
  category?: string;
  extension?: string | null;
}

export interface FileInfo extends BaseDocument {
  full_path: string;
  relative_path: string;
  size_bytes: number;
  parent_folder: string;
  depth: number;
}

export interface Category {
  name: string;
  count: number;
}

export interface FileType {
  extension: string;
  count: number;
}

export interface QueryResult {
  files: FileInfo[];
  total: number;
}

export interface Stats {
  totalFiles: number;
  totalSize: number;
  categories: Category[];
  fileTypes: FileType[];
}

export interface StructuredDataItem {
  id: number
  source_file_id: number
  schema_type: string
  data: Record<string, string>
  theme: string
  confidence: number
  imported_at: string
}

export interface DocumentSection {
  id: number
  file_id: number
  section_title: string
  section_level: number
  content: string
  has_table: boolean
  table_data: any
  extracted_entities: any
}

export interface SchemaInfo {
  type: string
  count: number
}

export interface KnowledgeRelation {
  id: number
  source_type: string
  source_id: number
  target_type: string
  target_id: number
  relation_type: string
  confidence: number
  metadata: any
}

// Dashboard
export interface DashboardOverview {
  totalFiles: number;
  totalSize: number;
  extractedCount: number;
  clustersCount: number;
  relationsCount: number;
  recentFiles: FileInfo[];
  categories: Category[];
  fileTypes: FileType[];
}

// Consult/Chat
export interface ConsultResponse {
  answer: string;
  source: 'ai' | 'fallback';
  documents: Array<{
    id: number;
    name: string;
    section: string;
    relevance: number;
  }>;
}

export interface QuickAnswer {
  question: string;
  answer: string;
}

// Crisis
export interface CrisisProtocol {
  id: number;
  name: string;
  summary: string;
  lastModified: string;
  status: 'atualizado' | 'rever' | 'critico';
}

export interface Spokesperson {
  name: string;
  role: string;
  document_count: number;
}

export interface CrisisChecklist {
  id: number;
  item: string;
  completed: boolean;
}

export interface CrisisOverview {
  protocols: CrisisProtocol[];
  spokespersons: Spokesperson[];
  checklist: CrisisChecklist[];
  readinessScore: number;
}

// Health
export interface PlanHealthData {
  overallScore: number;
  sectionScores?: Array<{
    section: string;
    score: number;
  }>;
  sectionCoverage?: Array<{
    section: string;
    docCount: number;
    status: 'ok' | 'warning' | 'critical';
    percentage: number;
  }>;
  gaps?: Array<{
    section: string;
    detail: string;
    severity: 'high' | 'medium' | 'low' | 'critical' | 'warning';
    description?: string;
  }>;
}

// Graph
export interface GraphNode {
  id: number;
  label: string;
  extension: string;
  category: string;
  size: string;
}

export interface GraphEdge {
  from: number;
  to: number;
  value: number;
  title: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Generator
export interface PressReleaseInput {
  protocol: string;
  title: string;
  facts: string;
  location: string;
  date: string;
  actions: string;
}

export interface PressReleaseResult {
  text: string;
  title: string;
}

// Simulator
export interface SimulatorScenario {
  id: number;
  title: string;
  description: string;
  options: Array<{
    id: number;
    text: string;
  }>;
  timeLimit: number;
}

export interface SimulatorEvaluation {
  score: number;
  feedback: string;
  details: string;
}
