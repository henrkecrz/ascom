import { getSetting } from '../database';

export type XlsxSchemaType =
  | 'contatos'
  | 'calendario'
  | 'orcamento'
  | 'relatorio'
  | 'indicadores'
  | 'cronograma'
  | 'clipping'
  | 'desconhecido';

export interface ColumnInfo {
  header: string;
  type: 'text' | 'date' | 'number' | 'currency';
  mappedField?: string;
}

export interface XlsxSchema {
  type: XlsxSchemaType;
  columns: ColumnInfo[];
  confidence: number;
  suggestedSection: string;
  sheetName: string;
}

const SCHEMA_SIGNATURES: { type: XlsxSchemaType; patterns: RegExp[]; section: string }[] = [
  {
    type: 'contatos',
    patterns: [/nome/i, /contato/i, /telefone/i, /email/i, /ve[ií]culo/i, /cargo/i, /celular/i, /whatsapp/i, /org[aã]o/i, /empresa/i, /fun[cç][aã]o/i],
    section: 'Relacionamento com Públicos',
  },
  {
    type: 'calendario',
    patterns: [/data/i, /evento/i, /local/i, /hor[aá]rio/i, /agenda/i, /datas/i, /per[ií]odo/i, /in[ií]cio/i, /t[eé]rmino/i, /prazo/i, /mês/i],
    section: 'Calendário de Eventos',
  },
  {
    type: 'orcamento',
    patterns: [/valor/i, /rubrica/i, /centro.?custo/i, /orçamento/i, /verba/i, /custo/i, /receita/i, /despesa/i, /previsto/i, /realizado/i, /r\$/i, /reais/i],
    section: 'Documentos Administrativos',
  },
  {
    type: 'clipping',
    patterns: [/ve[ií]culo/i, /mat[eé]ria/i, /data/i, /t[ií]tulo/i, /manchete/i, /link/i, /url/i, /veicula[cç][aã]o/i, /alcance/i, /audiência/i],
    section: 'Clipping e Monitoramento',
  },
  {
    type: 'cronograma',
    patterns: [/atividade/i, /respons[aá]vel/i, /in[ií]cio/i, /fim/i, /prazo/i, /etapa/i, /entrega/i, /status/i, /marco/i, /fase/i],
    section: 'Fluxos de Trabalho',
  },
  {
    type: 'indicadores',
    patterns: [/indicador/i, /meta/i, /resultado/i, /percentual/i, /índice/i, /kpi/i, /taxa/i, /mensal/i, /acumulado/i],
    section: 'Relatórios',
  },
];

const KNOWN_HEADER_MAP: Record<string, { field: string; type: 'text' | 'date' | 'number' | 'currency' }> = {
  'nome': { field: 'nome', type: 'text' },
  'contato': { field: 'nome', type: 'text' },
  'nome_contato': { field: 'nome', type: 'text' },
  'telefone': { field: 'telefone', type: 'text' },
  'celular': { field: 'telefone', type: 'text' },
  'whatsapp': { field: 'telefone', type: 'text' },
  'email': { field: 'email', type: 'text' },
  'e-mail': { field: 'email', type: 'text' },
  'veículo': { field: 'veiculo', type: 'text' },
  'veiculo': { field: 'veiculo', type: 'text' },
  'orgão': { field: 'organizacao', type: 'text' },
  'órgão': { field: 'organizacao', type: 'text' },
  'orgao': { field: 'organizacao', type: 'text' },
  'empresa': { field: 'organizacao', type: 'text' },
  'cargo': { field: 'cargo', type: 'text' },
  'função': { field: 'cargo', type: 'text' },
  'funcao': { field: 'cargo', type: 'text' },
  'data': { field: 'data', type: 'date' },
  'data_evento': { field: 'data', type: 'date' },
  'evento': { field: 'evento', type: 'text' },
  'local': { field: 'local', type: 'text' },
  'horário': { field: 'horario', type: 'text' },
  'horario': { field: 'horario', type: 'text' },
  'início': { field: 'inicio', type: 'date' },
  'inicio': { field: 'inicio', type: 'date' },
  'término': { field: 'termino', type: 'date' },
  'termino': { field: 'termino', type: 'date' },
  'prazo': { field: 'prazo', type: 'date' },
  'valor': { field: 'valor', type: 'currency' },
  'r$': { field: 'valor', type: 'currency' },
  'custo': { field: 'valor', type: 'currency' },
  'verba': { field: 'valor', type: 'currency' },
  'orçamento': { field: 'valor', type: 'currency' },
  'orcamento': { field: 'valor', type: 'currency' },
  'rubrica': { field: 'rubrica', type: 'text' },
  'centro_custo': { field: 'centro_custo', type: 'text' },
  'centro de custo': { field: 'centro_custo', type: 'text' },
  'link': { field: 'link', type: 'text' },
  'url': { field: 'link', type: 'text' },
  'título': { field: 'titulo', type: 'text' },
  'titulo': { field: 'titulo', type: 'text' },
  'manchete': { field: 'titulo', type: 'text' },
  'status': { field: 'status', type: 'text' },
  'observação': { field: 'observacao', type: 'text' },
  'observacao': { field: 'observacao', type: 'text' },
  'obs': { field: 'observacao', type: 'text' },
  'notas': { field: 'observacao', type: 'text' },
  'responsável': { field: 'responsavel', type: 'text' },
  'responsavel': { field: 'responsavel', type: 'text' },
  'atividade': { field: 'atividade', type: 'text' },
  'entrega': { field: 'entrega', type: 'text' },
  'indicador': { field: 'indicador', type: 'text' },
  'meta': { field: 'meta', type: 'number' },
  'resultado': { field: 'resultado', type: 'number' },
  'percentual': { field: 'percentual', type: 'number' },
  'realizado': { field: 'realizado', type: 'number' },
  'previsto': { field: 'previsto', type: 'number' },
};

const AI_SCHEMA_PROMPT = `Você é um analisador de planilhas da ASCOM/Novacap.
Analise os cabeçalhos da planilha abaixo e determine:
1. O tipo de schema (contatos, calendario, orcamento, relatorio, indicadores, cronograma, clipping, desconhecido)
2. Mapeamento de cada coluna para um campo padronizado
3. Confiança (0-1)

Cabeçalhos: {headers}

Responda APENAS com JSON:
{"type": "tipo", "confidence": 0.0, "section": "nome da seção", "columns": [{"header": "original", "type": "text|date|number|currency", "mappedField": "campo"}]}`;

function detectColumnType(values: string[]): 'text' | 'date' | 'number' | 'currency' {
  const nonEmpty = values.filter(v => v && v.trim().length > 0);
  if (nonEmpty.length === 0) return 'text';
  let dateCount = 0, numberCount = 0, currencyCount = 0;
  const dateRegex = /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}/;
  const currencyRegex = /^R?\$[\s]?[\d.,]+/;
  const numberRegex = /^[\d.,]+$/;
  for (const v of nonEmpty) {
    if (dateRegex.test(v)) dateCount++;
    else if (currencyRegex.test(v)) currencyCount++;
    else if (numberRegex.test(v.replace(/[.,\s]/g, ''))) numberCount++;
  }
  const total = nonEmpty.length;
  if (dateCount / total > 0.5) return 'date';
  if (currencyCount / total > 0.3) return 'currency';
  if (numberCount / total > 0.5) return 'number';
  return 'text';
}

function detectSchemaByHeaders(headers: string[]): { type: XlsxSchemaType; confidence: number; section: string } {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  let bestType: XlsxSchemaType = 'desconhecido';
  let bestScore = 0;
  let bestSection = 'Geral';
  for (const sig of SCHEMA_SIGNATURES) {
    let matches = 0;
    for (const h of lowerHeaders) {
      for (const p of sig.patterns) {
        if (p.test(h)) { matches++; break; }
      }
    }
    const score = matches / Math.max(sig.patterns.length, 1);
    if (score > bestScore) {
      bestScore = score;
      bestType = sig.type;
      bestSection = sig.section;
    }
  }
  return { type: bestType, confidence: Math.min(bestScore * 1.5, 1), section: bestSection };
}

function mapHeaders(headers: string[]): ColumnInfo[] {
  return headers.map(h => {
    const lower = h.toLowerCase().trim();
    const known = KNOWN_HEADER_MAP[lower];
    return {
      header: h,
      type: known?.type || 'text',
      mappedField: known?.field || lower.replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, ''),
    };
  });
}

export function analyzeXlsxHeaders(headers: string[], allRows: string[][]): XlsxSchema {
  const heuristic = detectSchemaByHeaders(headers);
  const columns = mapHeaders(headers);
  columns.forEach((col, i) => {
    const values = allRows.map(r => r[i] || '');
    col.type = detectColumnType(values) as ColumnInfo['type'];
  });
  return {
    type: heuristic.type,
    columns,
    confidence: heuristic.confidence,
    suggestedSection: heuristic.section,
    sheetName: '',
  };
}

export async function analyzeXlsxWithAI(
  headers: string[],
  sampleRows: string[][],
  sheetName: string
): Promise<XlsxSchema> {
  const apiKey = getSetting('ai_api_key');
  const baseUrl = getSetting('ai_base_url') || 'https://opencode.ai/zen/v1';
  const model = getSetting('ai_model') || 'opencode/deepseek-v4-flash-free';
  const heuristic = analyzeXlsxHeaders(headers, sampleRows);
  if (!apiKey || apiKey.trim().length <= 5) return { ...heuristic, sheetName };
  try {
    const prompt = AI_SCHEMA_PROMPT.replace('{headers}', JSON.stringify(headers));
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.replace(/^[^/]+\//, ''),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });
    if (!response.ok) return { ...heuristic, sheetName };
    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ...heuristic, sheetName };
    const jsonMatch = content.match(/\{[\s\S]*"type"[\s\S]*\}/);
    if (!jsonMatch) return { ...heuristic, sheetName };
    const parsed = JSON.parse(jsonMatch[0]);
    const aiColumns: ColumnInfo[] = (parsed.columns || []).map((c: any) => ({
      header: c.header || '',
      type: c.type || 'text',
      mappedField: c.mappedField || c.header?.toLowerCase().replace(/[^a-z0-9_]/g, '_') || '',
    }));
    return {
      type: parsed.type || heuristic.type,
      columns: aiColumns.length > 0 ? aiColumns : heuristic.columns,
      confidence: parsed.confidence || heuristic.confidence,
      suggestedSection: parsed.suggestedSection || parsed.section || heuristic.suggestedSection,
      sheetName,
    };
  } catch {
    return { ...heuristic, sheetName };
  }
}

export function getThemeFromSchema(schemaType: XlsxSchemaType): string {
  const themes: Record<XlsxSchemaType, string> = {
    contatos: 'relacionamento_imprensa',
    calendario: 'agenda_eventos',
    orcamento: 'orcamento_financeiro',
    relatorio: 'resultados_atuacao',
    indicadores: 'metricas_desempenho',
    cronograma: 'planejamento_prazos',
    clipping: 'monitoramento_midia',
    desconhecido: 'geral',
  };
  return themes[schemaType] || 'geral';
}


