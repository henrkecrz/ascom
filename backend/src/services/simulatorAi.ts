import { logger } from '../lib/logger';
import { callScopedLLM } from './aiProfile';

interface ScenarioOption {
  id: string;
  text: string;
  points: number;
  feedback: string;
}

interface Scenario {
  id: number;
  title: string;
  description: string;
  options: ScenarioOption[];
  difficulty?: string;
  category?: string;
  source?: string;
}

const SYSTEM_PROMPT_SCENARIO = `Você é um especialista em comunicação de crise da ASCOM (Assessoria de Comunicação) da Novacap (Companhia de Urbanização da Nova Capital do Brasil / GDF).

Sua função é gerar cenários realistas de simulação (war games) para treinar a equipe de comunicação.

Cada cenário deve:
- Ser baseado em situações reais que uma assessoria de comunicação enfrenta
- Ter 3 opções de resposta: uma excelente (100 pts), uma mediana (10-30 pts), e uma péssima (0 pts)
- Incluir feedback detalhado explicando POR QUE cada resposta é adequada ou inadequada
- Seguir as diretrizes do plano de comunicação: transparência, rapidez, alinhamento com diretoria, proteção da imagem institucional
- Estar categorizado em um dos seguintes eixos de crise/operação da Novacap:
  * obras_infraestrutura
  * meio_ambiente_saneamento
  * atendimento_imprensa
  * gestao_governanca
  * seguranca_saude

Gere APENAS um JSON válido com este formato EXATO:
{
  "title": "Título do Cenário",
  "description": "Descrição detalhada do cenário (2-3 frases)",
  "difficulty": "facil|medio|dificil",
  "category": "obras_infraestrutura|meio_ambiente_saneamento|atendimento_imprensa|gestao_governanca|seguranca_saude",
  "options": [
    {"id": "A", "text": "Texto da opção A", "points": 100, "feedback": "Feedback detalhado"},
    {"id": "B", "text": "Texto da opção B", "points": 20, "feedback": "Feedback detalhado"},
    {"id": "C", "text": "Texto da opção C", "points": 0, "feedback": "Feedback detalhado"}
  ]
}`;

const SYSTEM_PROMPT_EVALUATE = `Você é um avaliador especializado em comunicação de crise da Novacap ASCOM.

Avalie a resposta do usuário para o cenário de crise apresentado. Forneça pontuação, feedback, forças, fraquezas e recomendação.

Responda APENAS com JSON válido:
{"score": 0, "feedback": "texto", "strengths": [], "weaknesses": [], "recommendation": "texto"}`;

const SYSTEM_PROMPT_TALKING_POINTS = `Você é um consultor sênior de comunicação institucional da Novacap ASCOM.

Gere uma Matriz de Temas Sensíveis — guia de discurso oficial para porta-vozes.

Cada tema deve conter:
- approved: 3-4 frases factuais e aprovadas que o porta-voz PODE falar
- restricted: 2-3 frases sobre o que NÃO deve ser dito

Gere APENAS JSON válido:
{"title": "Nome do Tema", "category": "Categoria", "approved": ["frase"], "restricted": ["restrição"]}`;

async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const content = await callScopedLLM('queue_agents', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ], { temperature: 0.8, maxTokens: 2000, timeoutMs: 30000 });
  if (!content) throw new Error('Resposta vazia da IA');
  return content;
}

function parseJSON<T>(text: string): T | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

let scenarioIdCounter = 100;

export async function generateScenarios(count: number = 1, difficulty?: string, context?: string): Promise<Scenario[]> {
  const scenarios: Scenario[] = [];
  for (let i = 0; i < count; i++) {
    try {
      let userMessage = 'Gere um cenário de crise para simulação de war games da ASCOM Novacap.';
      if (difficulty && difficulty !== 'all') userMessage += ` Dificuldade: ${difficulty}.`;
      if (context) userMessage += ` Contexto adicional: ${context}.`;
      userMessage += ' Responda APENAS com o JSON.';

      const raw = await callLLM(SYSTEM_PROMPT_SCENARIO, userMessage);
      const parsed = parseJSON<{ title: string; description: string; difficulty?: string; category?: string; options: ScenarioOption[] }>(raw);
      if (!parsed?.title || !parsed?.description || !parsed?.options?.length) {
        logger.warn('Cenário gerado pela IA inválido, pulando');
        continue;
      }
      scenarios.push({
        id: scenarioIdCounter++,
        title: parsed.title,
        description: parsed.description,
        difficulty: parsed.difficulty || difficulty || 'medio',
        category: parsed.category || 'geral',
        source: 'ai',
        options: parsed.options.slice(0, 3).map((opt, idx) => ({
          id: String.fromCharCode(65 + idx),
          text: opt.text,
          points: typeof opt.points === 'number' ? opt.points : 0,
          feedback: opt.feedback || 'Feedback não disponível.',
        })),
      });
    } catch (e: any) {
      logger.error('Erro ao gerar cenário com IA', { message: e.message, attempt: i });
    }
  }
  return scenarios;
}

export async function evaluateAnswer(scenario: Scenario, userAnswer: string): Promise<{ score: number; feedback: string; strengths: string[]; weaknesses: string[]; recommendation: string } | null> {
  try {
    const userMessage = `Cenário: ${scenario.title}\nDescrição: ${scenario.description}\n\nResposta do usuário:\n${userAnswer}\n\nAvalie esta resposta de acordo com as melhores práticas de comunicação de crise da Novacap.`;
    const raw = await callLLM(SYSTEM_PROMPT_EVALUATE, userMessage);
    const parsed = parseJSON<{ score: number; feedback: string; strengths: string[]; weaknesses: string[]; recommendation: string }>(raw);
    if (!parsed || typeof parsed.score !== 'number') return null;
    return {
      score: Math.min(Math.max(parsed.score, 0), 100),
      feedback: parsed.feedback || 'Avaliação não disponível.',
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      recommendation: parsed.recommendation || '',
    };
  } catch (e: any) {
    logger.error('Erro ao avaliar resposta com IA', { message: e.message });
    return null;
  }
}

export async function generateTalkingPoints(context?: string): Promise<{ title: string; category: string; approved: string[]; restricted: string[] } | null> {
  try {
    const userMessage = context
      ? `Com base no contexto abaixo, gere um tema sensível para a matriz de discurso da Novacap:\n\n${context}\n\nResponda APENAS com o JSON.`
      : 'Gere um tema sensível para a matriz de discurso oficial da Novacap ASCOM. Responda APENAS com o JSON.';
    const raw = await callLLM(SYSTEM_PROMPT_TALKING_POINTS, userMessage);
    const parsed = parseJSON<{ title: string; category: string; approved: string[]; restricted: string[] }>(raw);
    if (!parsed?.title || !parsed?.approved?.length) return null;
    return {
      title: parsed.title,
      category: parsed.category || 'geral',
      approved: parsed.approved.slice(0, 4),
      restricted: parsed.restricted?.slice(0, 3) || [],
    };
  } catch (e: any) {
    logger.error('Erro ao gerar talking points com IA', { message: e.message });
    return null;
  }
}

export async function generateScenarioFromDocuments(docIds: number[]): Promise<Scenario | null> {
  try {
    const db = require('../database');
    const docInfos = docIds.map((id) => {
      const f = db.getFileById(id);
      if (!f) return null;
      const textStmt = db.getDatabase().prepare('SELECT raw_text FROM document_text WHERE file_id = ?');
      textStmt.bind([id]);
      let text = '';
      if (textStmt.step()) text = String(textStmt.getAsObject().raw_text || '');
      textStmt.free();
      return { name: f.name, text: text.substring(0, 1500) };
    }).filter(Boolean);

    if (docInfos.length === 0) return null;
    const context = docInfos.map((d) => `Documento: ${d!.name}\nConteúdo: ${d!.text}`).join('\n---\n');
    const userMessage = `Com base nos seguintes documentos institucionais da Novacap, crie um cenário de simulação de crise realista:\n\n${context}\n\nGere um cenário que envolva os temas destes documentos. Responda APENAS com o JSON.`;
    const raw = await callLLM(SYSTEM_PROMPT_SCENARIO, userMessage);
    const parsed = parseJSON<{ title: string; description: string; difficulty?: string; category?: string; options: ScenarioOption[] }>(raw);
    if (!parsed?.title || !parsed?.description || !parsed?.options?.length) return null;
    return {
      id: scenarioIdCounter++,
      title: parsed.title,
      description: parsed.description,
      difficulty: parsed.difficulty || 'medio',
      category: parsed.category || 'geral',
      source: 'ai-docs',
      options: parsed.options.slice(0, 3).map((opt, idx) => ({
        id: String.fromCharCode(65 + idx),
        text: opt.text,
        points: typeof opt.points === 'number' ? opt.points : 0,
        feedback: opt.feedback || 'Feedback não disponível.',
      })),
    };
  } catch (e: any) {
    logger.error('Erro ao gerar cenário baseado em documentos', { message: e.message });
    return null;
  }
}
