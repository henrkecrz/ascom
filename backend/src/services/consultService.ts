import { getDatabase, getSetting } from '../database';
import { logger } from '../lib/logger';
import { rankDocumentsByQuery } from '../analysis/semanticSearch';
import natural from 'natural';

const tokenizer = new natural.WordTokenizer();

const INTENT_PATTERNS: { intent: string; patterns: RegExp[]; entityType?: string }[] = [
  { intent: 'qual_protocolo', patterns: [/protocolo/i, /crise/i, /como\s+(agir|proceder|atuar)/i, /o\s+que\s+fazer/i, /emerg[eê]ncia/i] },
  { intent: 'quem_eh', patterns: [/quem/i, /porta[- ]?voz/i, /respons[aá]vel/i, /designado/i, /representante/i] },
  { intent: 'calendario', patterns: [/calend[aá]rio/i, /agenda/i, /evento/i, /previsto/i, /programa[cç][aã]o/i, /\bem\s+\w+\s+de\s+\d{4}\b/i] },
  { intent: 'listar', patterns: [/lista/i, /documentos/i, /arquivos/i, /quais/i, /existem/i, /temos/i] },
  { intent: 'resumir', patterns: [/resum[oa]/i, /sum[aá]rio/i, /sobre\s+o\s+que/i, /do\s+que\s+se\s+trata/i, /fale\s+sobre/i] },
  { intent: 'buscar', patterns: [/buscar/i, /procurar/i, /encontrar/i, /localizar/i, /onde\s+est[aá]/i] },
  { intent: 'atualizacao', patterns: [/atualizad[oaos]/i, /modificado/i, /recente/i, /novo/i, /\beste\s+m[eê]s\b/i, /\beste\s+ano\b/i] },
  { intent: 'comparar', patterns: [/comparar/i, /diferen[cç]a/i, /contrastar/i, /vs/i, /versus/i] },
];

export const QUICK_ANSWERS = [
  { question: 'Qual o protocolo em caso de crise com a imprensa?', intent: 'qual_protocolo' },
  { question: 'Quem é o porta-voz para assuntos de licitação?', intent: 'quem_eh' },
  { question: 'O que temos previsto para agosto no calendário?', intent: 'calendario' },
  { question: 'Quais documentos falam sobre comunicação interna?', intent: 'listar' },
  { question: 'Resuma o fluxo de atendimento à imprensa', intent: 'resumir' },
  { question: 'Que documentos foram atualizados este mês?', intent: 'atualizacao' },
];

function detectIntent(question: string): { intent: string; terms: string[] } {
  const tokens = tokenizer.tokenize(question.toLowerCase()) || [];
  const meaningful = tokens.filter(t => t.length > 2);

  for (const rule of INTENT_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(question)) {
        return { intent: rule.intent, terms: meaningful };
      }
    }
  }

  return { intent: 'buscar', terms: meaningful };
}

function searchRelevantDocs(db: any, terms: string[], question: string, docType?: string, limit: number = 10): any[] {
  if (terms.length === 0) {
    if (docType) {
      const stmt = db.prepare(`
        SELECT f.id, f.name, f.extension, f.doc_type, f.doc_type_confidence, f.plan_section,
               f.category, ds.summary, ds.keywords, ds.word_count, dt.raw_text
        FROM files f
        LEFT JOIN document_summary ds ON ds.file_id = f.id
        LEFT JOIN document_text dt ON dt.file_id = f.id
        WHERE f.doc_type = ?
        ORDER BY ds.word_count DESC
        LIMIT ?
      `);
      stmt.bind([docType, limit]);
      const results: any[] = [];
      while (stmt.step()) results.push(stmt.getAsObject() as any);
      stmt.free();
      return results;
    }
    return [];
  }

  const typeFilter = docType ? "AND f.doc_type = ?" : "";
  const typeParams = docType ? [docType] : [];

  const likeClauses = terms.map(() => "(f.name LIKE ? OR COALESCE(ds.summary, '') LIKE ? OR COALESCE(ds.keywords, '') LIKE ? OR COALESCE(f.plan_section, '') LIKE ? OR COALESCE(dt.raw_text, '') LIKE ?)").join(' OR ');
  const likeParams: string[] = [];
  for (const term of terms) {
    const p = `%${term}%`;
    likeParams.push(p, p, p, p, p);
  }

  const results: any[] = [];

  const trySearch = (whereClause: string, params: any[]) => {
    const stmt = db.prepare(`
      SELECT f.id, f.name, f.extension, f.doc_type, f.doc_type_confidence, f.plan_section,
             f.category, ds.summary, ds.keywords, ds.word_count, dt.raw_text
      FROM files f
      LEFT JOIN document_summary ds ON ds.file_id = f.id
      LEFT JOIN document_text dt ON dt.file_id = f.id
      WHERE ${whereClause}
      ORDER BY f.doc_type_confidence DESC, ds.word_count DESC
      LIMIT ?
    `);
    stmt.bind([...params, limit]);
    while (stmt.step()) results.push(stmt.getAsObject() as any);
    stmt.free();
  };

  trySearch(`${likeClauses} ${typeFilter}`, [...likeParams, ...typeParams]);

  if (results.length === 0 && docType) {
    trySearch(`f.doc_type = ?`, [docType]);
  }

  if (results.length === 0 && terms.length > 0) {
    const stmt = db.prepare(`
      SELECT f.id, f.name, f.extension, f.doc_type, f.doc_type_confidence, f.plan_section,
             f.category, ds.summary, ds.keywords, ds.word_count, dt.raw_text
      FROM files f
      LEFT JOIN document_summary ds ON ds.file_id = f.id
      LEFT JOIN document_text dt ON dt.file_id = f.id
      WHERE dt.raw_text IS NOT NULL AND length(dt.raw_text) > 10
      ORDER BY ds.word_count DESC
      LIMIT ?
    `);
    stmt.bind([limit * 3]);
    const allDocs: any[] = [];
    while (stmt.step()) allDocs.push(stmt.getAsObject() as any);
    stmt.free();
    if (allDocs.length > 0) {
      const ranked = rankDocumentsByQuery(question, allDocs.map(d => ({ id: Number(d.id), text: String(d.raw_text || '') + ' ' + String(d.name || '') }))).slice(0, limit);
      const ids = new Set(ranked.map(r => r.id));
      return ranked.map(r => rowToResult(allDocs.find((d: any) => Number(d.id) === r.id) || allDocs[0]));
    }
  }

  return results.map(rowToResult);
}

function rowToResult(row: any) {
  return {
    id: Number(row.id),
    name: String(row.name),
    extension: String(row.extension || ''),
    docType: String(row.doc_type || ''),
    docTypeLabel: String(row.doc_type || ''),
    planSection: String(row.plan_section || ''),
    summary: String(row.summary || ''),
    keywords: String(row.keywords || ''),
    wordCount: Number(row.word_count || 0),
    rawText: String(row.raw_text || ''),
  };
}

function buildResponse(intent: string, docs: any[], question: string): any {
  if (docs.length === 0) {
    return {
      answer: 'Não encontrei documentos relacionados à sua pergunta. Tente reformular ou buscar por termos mais específicos.',
      documents: [],
    };
  }

  const docList = docs.map((d: any, i: number) =>
    `${i + 1}. **${d.name}** (${d.docType}) — ${d.summary?.substring(0, 120) || 'sem resumo'}`
  ).join('\n');

  let answer = '';
  switch (intent) {
    case 'qual_protocolo':
      answer = `📋 **Protocolos encontrados:**\n\n${docList}\n\n*Clique em um documento para ver os detalhes completos do protocolo.*`;
      break;
    case 'quem_eh': {
      const spokes = docs.filter(d => d.docType === 'porta_voz');
      if (spokes.length > 0) {
        answer = `🎤 **Porta-Vozes encontrados:**\n\n${spokes.map((d: any) => `• ${d.name}`).join('\n')}`;
      } else {
        answer = `📄 **Documentos relacionados:**\n\n${docList}`;
      }
      break;
    }
    case 'calendario':
      answer = `📅 **Eventos e calendários encontrados:**\n\n${docList}`;
      break;
    case 'listar':
      answer = `📚 **Documentos encontrados (${docs.length}):**\n\n${docList}`;
      break;
    case 'resumir':
      answer = `📝 **Resumo dos documentos encontrados:**\n\n${docList}`;
      break;
    case 'atualizacao':
      answer = `🕐 **Documentos recentes e atualizados:**\n\n${docList}`;
      break;
    default:
      answer = `🔍 **Resultados da busca:**\n\n${docList}`;
  }

  return { answer, documents: docs.slice(0, 10) };
}

export function getQuickAnswers() {
  return { questions: QUICK_ANSWERS };
}

export async function processQuestion(question: string) {
  const db = getDatabase();
  if (!db) throw new Error('Banco não inicializado');

  const { intent, terms } = detectIntent(question);

  let docTypeFilter: string | undefined;
  if (/crise|protocolo|emergência/i.test(question)) docTypeFilter = 'protocolo_crise';
  else if (/porta[- ]?voz|quem fala/i.test(question)) docTypeFilter = 'porta_voz';
  else if (/calend[aá]rio|agenda|evento/i.test(question)) docTypeFilter = 'calendario_agenda';
  else if (/fluxo|processo|procedimento/i.test(question)) docTypeFilter = 'fluxo_trabalho';
  else if (/sens[ií]vel|confidencial/i.test(question)) docTypeFilter = 'assunto_sensivel';
  else if (/norma|diretriz|manual/i.test(question)) docTypeFilter = 'normativa_diretriz';
  else if (/relat[oó]rio|balanço/i.test(question)) docTypeFilter = 'relatorio_atuacao';
  else if (/campanha|material/i.test(question)) docTypeFilter = 'material_campanha';
  else if (/clipping|monitoramento|imprensa/i.test(question)) docTypeFilter = 'clipping_monitoramento';

  let docs = searchRelevantDocs(db, terms, question, docTypeFilter);

  if (docs.length === 0 && docTypeFilter) {
    docs = searchRelevantDocs(db, terms, question, undefined);
  }

  if (docs.length === 0) {
    const fallback = buildResponse(intent, docs, question);
    return { intent, ...fallback, source: 'local_ml_fallback' };
  }

  const encryptedKey = getSetting('ai_api_key');
  const apiKey = encryptedKey ? require('../lib/crypto').decrypt(encryptedKey) : '';
  const baseUrl = (getSetting('ai_base_url') || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
  const rawModel = getSetting('ai_model') || 'opencode/deepseek-v4-flash-free';
  const model = rawModel.replace(/^[^/]+\//, '');
  const potency = getSetting('ai_potency') || '0.7';
  const isFreeProvider = !apiKey || apiKey.trim().length <= 5;

  try {
    const contextText = docs.map((d, i) =>
      `[Doc ${i + 1}] Nome: ${d.name}\nSeção: ${d.planSection || 'Geral'}\nResumo: ${d.summary || 'Sem resumo'}\nConteúdo: ${d.rawText ? d.rawText.substring(0, 1200) : 'Sem conteúdo'}`
    ).join('\n\n');

    const systemPrompt = `Você é o assistente inteligente da ASCOM (Assessoria de Comunicação) da Novacap.
Sua tarefa é responder a dúvidas operacionais de jornalistas e assessores de imprensa com base exclusivamente nos documentos de referência do Plano de Comunicação fornecidos abaixo.
Seja conciso, profissional, claro e objetivo. Em caso de crises, indique sempre o porta-voz autorizado e o protocolo pré-validado.

DOCUMENTOS DE REFERÊNCIA:
${contextText}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isFreeProvider) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(25000),
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: parseFloat(potency)
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const answer = data.choices?.[0]?.message?.content || 'Não foi possível extrair uma resposta do modelo.';

    return {
      intent,
      answer,
      documents: docs.slice(0, 10),
      source: `opencode_ai (${model})`
    };
  } catch (e: any) {
    logger.warn('Falha ao utilizar IA, usando fallback local', { message: e.message });
  }

  const fallback = buildResponse(intent, docs, question);
  return { intent, ...fallback, source: 'local_ml_fallback' };
}
