import { AgentRequest, AgentResponse, RiskLevel } from './types';

const CRITICAL_PATTERNS = [/morte/i, /fatal/i, /opera[cç][aã]o policial/i, /corrup[cç][aã]o/i, /fraude/i, /desvio/i, /improbidade/i];
const HIGH_PATTERNS = [/acidente/i, /investiga[cç][aã]o/i, /minist[eé]rio p[uú]blico/i, /tribunal/i, /tcdf/i, /tcu/i, /greve/i, /interdi[cç][aã]o/i, /queda de [aá]rvore/i, /desabamento/i, /vazamento/i];
const MEDIUM_PATTERNS = [/imprensa/i, /crise/i, /den[uú]ncia/i, /reclama[cç][aã]o/i, /redes sociais/i, /viral/i, /licita[cç][aã]o/i, /contrato/i, /obra/i];

function detectRisk(text: string): { level: RiskLevel; score: number; matches: string[] } {
  const matches: string[] = [];

  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.test(text)) matches.push(pattern.source);
  }
  if (matches.length > 0) return { level: 'critico', score: 0.95, matches };

  for (const pattern of HIGH_PATTERNS) {
    if (pattern.test(text)) matches.push(pattern.source);
  }
  if (matches.length > 0) return { level: 'alto', score: 0.82, matches };

  for (const pattern of MEDIUM_PATTERNS) {
    if (pattern.test(text)) matches.push(pattern.source);
  }
  if (matches.length > 0) return { level: 'medio', score: 0.65, matches };

  return { level: 'baixo', score: 0.4, matches };
}

export async function riskAgent(request: AgentRequest): Promise<AgentResponse> {
  const risk = detectRisk(`${request.question} ${request.context?.text || ''}`);

  const actionsByRisk: Record<RiskLevel, string[]> = {
    baixo: ['Responder com tom informativo', 'Registrar a demanda para histórico'],
    medio: ['Validar informações com a área técnica', 'Evitar afirmações sem fonte documental', 'Preparar resposta institucional objetiva'],
    alto: ['Acionar coordenação da ASCOM', 'Validar posicionamento com diretoria responsável', 'Definir porta-voz antes de responder', 'Preparar nota com fatos confirmados'],
    critico: ['Acionar protocolo de crise imediatamente', 'Submeter resposta à alta gestão', 'Centralizar fala em porta-voz autorizado', 'Registrar linha do tempo e fatos confirmados'],
  };

  return {
    agent: 'risk_agent',
    title: 'Agente de Risco Institucional',
    answer: `Nível de risco identificado: **${risk.level.toUpperCase()}**.\n\nA recomendação é tratar o tema com validação institucional antes de qualquer publicação ou resposta externa.`,
    confidence: risk.score,
    riskLevel: risk.level,
    recommendedActions: actionsByRisk[risk.level],
    metadata: {
      matchedPatterns: risk.matches,
    },
  };
}
