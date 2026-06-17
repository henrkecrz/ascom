import { getSetting } from '../database';
import { decrypt } from '../lib/crypto';
import { logger } from '../lib/logger';

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
  source?: string;
}

const SYSTEM_PROMPT_SCENARIO = `Você é um especialista em comunicação de crise da ASCOM (Assessoria de Comunicação) da Novacap (Companhia de Urbanização da Nova Capital do Brasil / GDF).

Sua função é gerar cenários realistas de simulação (war games) para treinar a equipe de comunicação.

Cada cenário deve:
- Ser baseado em situações reais que uma assessoria de comunicação enfrenta
- Ter 3 opções de resposta: uma excelente (100 pts), uma mediana (10-30 pts), e uma péssima (0 pts)
- Incluir feedback detalhado explicando POR QUE cada resposta é adequada ou inadequada
- Seguir as diretrizes do plano de comunicação: transparência, rapidez, alinhamento com diretoria, proteção da imagem institucional

Gere APENAS um JSON válido com este formato EXATO:
{
  "title": "Título do Cenário",
  "description": "Descrição detalhada do cenário (2-3 frases)",
  "difficulty": "facil|medio|dificil",
  "options": [
    {
      "id": "A",
      "text": "Texto da opção A",
      "points": 100,
      "feedback": "Feedback detalhado explicando por que esta é a melhor opção (2-3 frases)"
    },
    {
      "id": "B",
      "text": "Texto da opção B",
      "points": 20,
      "feedback": "Feedback explicando por que esta opção é insuficiente ou inadequada"
    },
    {
      "id": "C",
      "text": "Texto da opção C",
      "points": 0,
      "feedback": "Feedback explicando por que esta opção é péssima e quais as consequências"
    }
  ]
}`;

const SYSTEM_PROMPT_EVALUATE = `Você é um avaliador especializado em comunicação de crise da Novacap ASCOM.

Avalie a resposta do usuário para o cenário de crise apresentado. Forneça:
1. Uma pontuação de 0 a 100
2. Feedback detalhado sobre os pontos fortes e fracos
3. Recomendações de melhoria

Responda APENAS com um JSON válido neste formato:
{
  "score": 0-100,
  "feedback": "Feedback detalhado (2-4 frases)",
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "weaknesses": ["ponto fraco 1", "ponto fraco 2"],
  "recommendation": "Recomendação final de melhoria"
}`;

function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const encryptedKey = getSetting('ai_api_key');
  const apiKey = encryptedKey ? decrypt(encryptedKey) : '';
  const baseUrl = (getSetting('ai_base_url') || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
  const model = (getSetting('ai_model') || 'opencode/deepseek-v4-flash-free').replace(/^[^/]+\//, '');
  const hasValidKey = apiKey && apiKey.trim().length > 5;

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hasValidKey) headers['Authorization'] = `Bearer ${apiKey}`;

    fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }
        return res.json();
      })
      .then((data: any) => {
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('Resposta vazia da IA');
        resolve(content);
      })
      .catch(reject);
  });
}

function parseJSON<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}

let scenarioIdCounter = 100;

export async function generateScenarios(
  count: number = 1,
  difficulty?: string,
  context?: string
): Promise<Scenario[]> {
  const scenarios: Scenario[] = [];

  for (let i = 0; i < count; i++) {
    try {
      let userMessage = 'Gere um cenário de crise para simulação de war games da ASCOM Novacap.';
      if (difficulty && difficulty !== 'all') {
        userMessage += ` Dificuldade: ${difficulty}.`;
      }
      if (context) {
        userMessage += ` Contexto adicional: ${context}.`;
      }
      userMessage += ' Responda APENAS com o JSON.';

      const raw = await callLLM(SYSTEM_PROMPT_SCENARIO, userMessage);
      const parsed = parseJSON<{
        title: string;
        description: string;
        difficulty?: string;
        options: ScenarioOption[];
      }>(raw);

      if (!parsed?.title || !parsed?.description || !parsed?.options?.length) {
        logger.warn('Cenário gerado pela IA inválido, pulando');
        continue;
      }

      if (parsed.options.length !== 3) {
        logger.warn('Cenário sem 3 opções, ajustando');
      }

      scenarios.push({
        id: scenarioIdCounter++,
        title: parsed.title,
        description: parsed.description,
        difficulty: parsed.difficulty || difficulty || 'medio',
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

export async function evaluateAnswer(
  scenario: Scenario,
  userAnswer: string
): Promise<{
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
} | null> {
  try {
    const userMessage = `Cenário: ${scenario.title}\nDescrição: ${scenario.description}\n\nResposta do usuário:\n${userAnswer}\n\nAvalie esta resposta de acordo com as melhores práticas de comunicação de crise da Novacap.`;

    const raw = await callLLM(SYSTEM_PROMPT_EVALUATE, userMessage);
    const parsed = parseJSON<{
      score: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
      recommendation: string;
    }>(raw);

    if (!parsed || typeof parsed.score !== 'number') {
      return null;
    }

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

const SYSTEM_PROMPT_TALKING_POINTS = `Você é um consultor sênior de comunicação institucional da Novacap ASCOM.

Sua função é gerar uma Matriz de Temas Sensíveis — um guia de discurso oficial para porta-vozes.

Cada tema deve conter:
- "approved": 3-4 frases factuais e aprovadas que o porta-voz PODE falar (dados objetivos, posição oficial)
- "restricted": 2-3 frases sobre o que NÃO deve ser dito (armadilhas, informações protegidas, riscos jurídicos)

Os temas devem ser sobre situações reais de comunicação da Novacap: obras, licitações, crises, relacionamento com comunidades, meio ambiente, etc.

Gere APENAS um JSON válido com este formato EXATO:
{
  "title": "Nome do Tema Sensível",
  "category": "Categoria do tema (ex: Infraestrutura, Jurídico, Emergências)",
  "approved": [
    "Frase aprovada 1 com dados factuais e objetivos",
    "Frase aprovada 2 com posicionamento oficial",
    "Frase aprovada 3 com diretriz da companhia"
  ],
  "restricted": [
    "Restrição 1 - o que evitar falar",
    "Restrição 2 - risco jurídico ou de imagem"
  ]
}`;

export async function generateTalkingPoints(context?: string): Promise<{
  title: string;
  category: string;
  approved: string[];
  restricted: string[];
} | null> {
  try {
    const userMessage = context
      ? `Com base no contexto abaixo, gere um tema sensível para a matriz de discurso da Novacap:\n\n${context}\n\nResponda APENAS com o JSON.`
      : 'Gere um tema sensível para a matriz de discurso oficial da Novacap ASCOM. Responda APENAS com o JSON.';

    const raw = await callLLM(SYSTEM_PROMPT_TALKING_POINTS, userMessage);
    const parsed = parseJSON<{
      title: string;
      category: string;
      approved: string[];
      restricted: string[];
    }>(raw);

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
    const docInfos = docIds
      .map((id) => {
        const f = db.getFileById(id);
        if (!f) return null;
        const textStmt = db.getDatabase().prepare('SELECT raw_text FROM document_text WHERE file_id = ?');
        textStmt.bind([id]);
        let text = '';
        if (textStmt.step()) text = String(textStmt.getAsObject().raw_text || '');
        textStmt.free();
        return { name: f.name, text: text.substring(0, 1500) };
      })
      .filter(Boolean);

    if (docInfos.length === 0) return null;

    const context = docInfos
      .map((d) => `Documento: ${d!.name}\nConteúdo: ${d!.text}`)
      .join('\n---\n');

    const userMessage = `Com base nos seguintes documentos institucionais da Novacap, crie um cenário de simulação de crise realista:\n\n${context}\n\nGere um cenário que envolva os temas destes documentos. Responda APENAS com o JSON.`;

    const raw = await callLLM(SYSTEM_PROMPT_SCENARIO, userMessage);
    const parsed = parseJSON<{
      title: string;
      description: string;
      difficulty?: string;
      options: ScenarioOption[];
    }>(raw);

    if (!parsed?.title || !parsed?.description || !parsed?.options?.length) return null;

    return {
      id: scenarioIdCounter++,
      title: parsed.title,
      description: parsed.description,
      difficulty: parsed.difficulty || 'medio',
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
