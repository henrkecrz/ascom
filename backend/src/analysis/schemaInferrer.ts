import { logger } from '../lib/logger';
import { callScopedLLM } from '../services/aiProfile';

export interface InferredColumn {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'DATE' | 'BOOLEAN' | 'JSON' | 'CPF' | 'CNPJ' | 'CEP' | 'PHONE' | 'EMAIL' | 'URL';
  description: string;
  nullable: boolean;
  isKey?: boolean;
  sampleValues: string[];
}

export interface InferredSchema {
  dataType: string;
  confidence: number;
  tableName: string;
  columns: InferredColumn[];
  shouldCreateTable: boolean;
  description: string;
  relationships: { type: string; targetTable: string; via: string }[];
  suggestedDashboard: string;
}

const SYSTEM_PROMPT = `Sistema: Você é um analisador de schemas de dados da ASCOM/Novacap.
Analise os dados abaixo e determine a estrutura ideal para armazená-los.

Contexto: Trabalhamos com documentos de assessoria de comunicação:
contatos de imprensa, calendários de eventos, orçamentos, 
protocolos de crise, fluxos de trabalho, relatórios de atuação,
indicadores de desempenho, clippings de mídia, cronogramas.

Para cada campo, determine o nome da coluna, tipo (TEXT, INTEGER, REAL, DATE, BOOLEAN),
se é chave primária, e uma descrição curta.

Responda APENAS com JSON válido:
{
  "dataType": "tipo_detectado",
  "confidence": 0.0-1.0,
  "tableName": "nome_da_tabela",
  "description": "descrição",
  "columns": [
    {"name": "coluna", "type": "TIPO", "description": "descrição", "nullable": true, "isKey": false}
  ],
  "shouldCreateTable": false,
  "relationships": [],
  "suggestedDashboard": "tipo_de_dashboard"
}`;

const DATA_TYPE_PATTERNS: [RegExp, string][] = [
  [/contato|imprensa|jornalista|email|telefone|celular/i, 'contatos'],
  [/calendario|agenda|evento|cronograma/i, 'calendario'],
  [/orcamento|budget|custo|verba|financeiro/i, 'orcamento'],
  [/protocolo|crise|emergencia|contingencia/i, 'protocolo'],
  [/fluxo|processo|workflow|procedimento|rotina/i, 'fluxo'],
  [/relatorio|balanco|resultado|prestacao/i, 'relatorio'],
  [/indicador|kpi|desempenho|meta|resultado/i, 'indicadores'],
  [/clipping|midia|materia|monitoramento|veiculo/i, 'clipping'],
  [/cronograma|prazo|etapa|fase|marco/i, 'cronograma'],
];

const COLUMN_SIGNATURES: [RegExp, string][] = [
  [/nome|email|telefone|celular|cargo|empresa|contato/i, 'contatos'],
  [/data|horario|evento|local|descricao|agenda/i, 'calendario'],
  [/item|valor|quantidade|custo|total|preco|verba/i, 'orcamento'],
  [/titulo|data|status|prioridade|responsavel|prazo/i, 'fluxo'],
  [/indicador|meta|realizado|periodo|atingido|calculado/i, 'indicadores'],
  [/veiculo|data|titulo|link|tipo|manchete|repercusso/i, 'clipping'],
];

const TABLE_NAME_MAP: Record<string, string> = {
  contatos: 'contacts',
  calendario: 'events',
  orcamento: 'budgets',
  protocolo: 'crisis_protocols',
  fluxo: 'workflows',
  relatorio: 'reports',
  indicadores: 'indicators',
  cronograma: 'schedules',
  clipping: 'media_clippings',
  desconhecido: 'imported_data',
};

const DASHBOARD_MAP: Record<string, string> = {
  contatos: 'contact_list',
  calendario: 'timeline',
  orcamento: 'budget_chart',
  protocolo: 'status_board',
  fluxo: 'flowchart',
  relatorio: 'summary_cards',
  indicadores: 'kpi_dashboard',
  cronograma: 'gantt_chart',
  clipping: 'media_wall',
};

const DESCRIPTION_MAP: Record<string, string> = {
  contatos: 'Contatos de imprensa, jornalistas e veículos de comunicação',
  calendario: 'Calendário de eventos, agendas e compromissos',
  orcamento: 'Orçamentos e recursos financeiros',
  protocolo: 'Protocolos de crise, emergência e contingência',
  fluxo: 'Fluxos de trabalho, processos e procedimentos',
  relatorio: 'Relatórios de atuação e resultados',
  indicadores: 'Indicadores de desempenho e KPIs',
  cronograma: 'Cronogramas, prazos e marcos',
  clipping: 'Clipping e monitoramento de mídia',
  desconhecido: 'Dados importados de tipo não identificado',
};

const INTEGER_RE = /^\d+$/;
const REAL_RE = /^\d+[.,]\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{4}$/;
const BOOLEAN_RE = /^(true|false|sim|não|nao|verdadeiro|falso|0|1|s|n)$/i;
const CPF_RE = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const CNPJ_RE = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
const CEP_RE = /^\d{5}-?\d{3}$/;
const PHONE_RE = /^(?:\+55)?\s?(?:\(?\d{2}\)?)\s?\d{4,5}-?\d{4}$/;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_RE = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

function parseAIResponse(text: string): Partial<InferredSchema> | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (parsed.dataType && Array.isArray(parsed.columns)) return parsed;
  } catch {}
  return null;
}

export function inferColumnType(values: string[]): InferredColumn['type'] {
  const cleaned = values.filter(v => v != null && v !== '');
  if (cleaned.length === 0) return 'TEXT';
  const nonNull = cleaned.map(v => String(v).trim()).filter(Boolean);
  if (nonNull.length === 0) return 'TEXT';
  const total = nonNull.length;
  const matchCount: Record<InferredColumn['type'], number> = {
    INTEGER: 0, REAL: 0, DATE: 0, BOOLEAN: 0, TEXT: 0, JSON: 0,
    CPF: 0, CNPJ: 0, CEP: 0, PHONE: 0, EMAIL: 0, URL: 0
  };
  for (const val of nonNull) {
    if (BOOLEAN_RE.test(val)) matchCount.BOOLEAN++;
    else if (CPF_RE.test(val)) matchCount.CPF++;
    else if (CNPJ_RE.test(val)) matchCount.CNPJ++;
    else if (CEP_RE.test(val)) matchCount.CEP++;
    else if (PHONE_RE.test(val)) matchCount.PHONE++;
    else if (EMAIL_RE.test(val)) matchCount.EMAIL++;
    else if (URL_RE.test(val)) matchCount.URL++;
    else if (INTEGER_RE.test(val)) matchCount.INTEGER++;
    else if (REAL_RE.test(val)) matchCount.REAL++;
    else if (DATE_RE.test(val)) matchCount.DATE++;
    else matchCount.TEXT++;
  }
  const threshold = 0.7;
  const candidates: [InferredColumn['type'], number][] = [
    ['BOOLEAN', matchCount.BOOLEAN / total], ['CPF', matchCount.CPF / total], ['CNPJ', matchCount.CNPJ / total],
    ['CEP', matchCount.CEP / total], ['PHONE', matchCount.PHONE / total], ['EMAIL', matchCount.EMAIL / total],
    ['URL', matchCount.URL / total], ['INTEGER', matchCount.INTEGER / total], ['REAL', matchCount.REAL / total],
    ['DATE', matchCount.DATE / total], ['TEXT', matchCount.TEXT / total],
  ];
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0][1] >= threshold ? candidates[0][0] : 'TEXT';
}

export function suggestTableName(dataType: string): string {
  return TABLE_NAME_MAP[dataType] || 'imported_data';
}

function suggestDashboard(dataType: string): string {
  return DASHBOARD_MAP[dataType] || 'table';
}

function detectTypeByColumns(columns: string[]): string | null {
  const joined = columns.join(' ');
  for (const [pattern, type] of COLUMN_SIGNATURES) {
    if (pattern.test(joined)) return type;
  }
  return null;
}

function detectTypeByName(name: string): string | null {
  for (const [pattern, type] of DATA_TYPE_PATTERNS) {
    if (pattern.test(name)) return type;
  }
  return null;
}

function heuristicInfer(name: string, sampleData: any[], extension: string): InferredSchema {
  const columns = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
  const nameType = detectTypeByName(name);
  const colType = columns.length > 0 ? detectTypeByColumns(columns) : null;
  const dataType = nameType || colType || 'desconhecido';
  let confidence = 0.4;
  if (nameType && colType && nameType === colType) confidence = 0.75;
  else if (nameType) confidence = 0.6;
  else if (colType) confidence = 0.5;
  if (extension === '.csv' || extension === '.xlsx') confidence = Math.min(confidence + 0.1, 1);
  const inferredColumns: InferredColumn[] = columns.map(col => {
    const values = sampleData.map(r => String(r[col] ?? ''));
    const type = inferColumnType(values);
    const nullable = values.some(v => v === '' || v === null || v === undefined);
    return { name: col, type, description: `Coluna ${col}`, nullable, sampleValues: values.slice(0, 5).filter(Boolean) };
  });
  return {
    dataType,
    confidence,
    tableName: suggestTableName(dataType),
    columns: inferredColumns,
    shouldCreateTable: true,
    description: DESCRIPTION_MAP[dataType] || 'Dados importados',
    relationships: [],
    suggestedDashboard: suggestDashboard(dataType),
  };
}

export async function inferSchema(name: string, sampleData: any[], extension: string, fullText?: string): Promise<InferredSchema> {
  const fallback = (): InferredSchema => heuristicInfer(name, sampleData, extension);
  const sampleJson = JSON.stringify(sampleData.slice(0, 5), null, 2);
  const textPreview = fullText ? fullText.substring(0, 2000) : '';

  try {
    const content = await callScopedLLM('queue_agents', [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Nome do arquivo: ${name}\nExtensão: ${extension}\n\nAmostra dos dados (primeiras linhas):\n${sampleJson}\n\nTexto extraído:\n${textPreview}` },
    ], { temperature: 0.1, maxTokens: 500, timeoutMs: 15000 });

    if (!content) return fallback();
    const aiResult = parseAIResponse(content);
    if (!aiResult) return fallback();

    const heuristic = fallback();
    const columns = aiResult.columns!.map(col => {
      const rawValues = sampleData.map(r => String(r[col.name] ?? ''));
      return { ...col, sampleValues: rawValues.slice(0, 5).filter(Boolean) };
    });

    const schema: InferredSchema = {
      dataType: aiResult.dataType!,
      confidence: Math.min(Math.max(Number(aiResult.confidence) || 0, 0), 1),
      tableName: aiResult.tableName || suggestTableName(aiResult.dataType!),
      columns,
      shouldCreateTable: aiResult.shouldCreateTable ?? true,
      description: aiResult.description || heuristic.description,
      relationships: aiResult.relationships || [],
      suggestedDashboard: aiResult.suggestedDashboard || heuristic.suggestedDashboard,
    };

    if (schema.confidence < 0.5) return { ...heuristic, confidence: heuristic.confidence * 0.8 };
    return schema;
  } catch (e: any) {
    logger.warn('Schema inferrer API error, falling back to heuristics', { message: e.message });
    return fallback();
  }
}
