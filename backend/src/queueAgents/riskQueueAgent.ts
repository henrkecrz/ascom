import { getDatabase } from '../database';
import { QueueAgentHandler, QueueRiskLevel } from './types';

const CRITICAL_PATTERNS = [
  /morte/i, /[oó]bito/i, /fatal/i, /corrup[cç][aã]o/i, /fraude/i,
  /desvio/i, /improbidade/i, /opera[cç][aã]o policial/i,
];
const HIGH_PATTERNS = [
  /acidente/i, /queda de [aá]rvore/i, /desabamento/i, /interdi[cç][aã]o/i,
  /minist[eé]rio p[uú]blico/i, /tcdf/i, /tcu/i, /investiga[cç][aã]o/i,
  /den[uú]ncia/i, /vazamento/i,
];
const MEDIUM_PATTERNS = [
  /imprensa/i, /mat[eé]ria negativa/i, /redes sociais/i, /viral/i, /reclama[cç][aã]o/i,
  /licita[cç][aã]o/i, /contrato/i, /obra/i, /atraso/i, /cr[ií]tica/i,
];

function readDocumentText(fileId: number): string {
  const db = getDatabase();
  if (!db) return '';

  const parts: string[] = [];
  const fileStmt = db.prepare('SELECT name, category, doc_type, plan_section, entities FROM files WHERE id = ?');
  fileStmt.bind([fileId]);
  if (fileStmt.step()) {
    const row = fileStmt.getAsObject() as any;
    parts.push(String(row.name || ''));
    parts.push(String(row.category || ''));
    parts.push(String(row.doc_type || ''));
    parts.push(String(row.plan_section || ''));
    parts.push(String(row.entities || ''));
  }
  fileStmt.free();

  const textStmt = db.prepare('SELECT raw_text FROM document_text WHERE file_id = ?');
  textStmt.bind([fileId]);
  if (textStmt.step()) {
    const row = textStmt.getAsObject() as any;
    parts.push(String(row.raw_text || '').substring(0, 10000));
  }
  textStmt.free();

  return parts.join('\n');
}

function collectMatches(patterns: RegExp[], text: string): string[] {
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

function detectRisk(text: string): { riskLevel: QueueRiskLevel; confidence: number; matches: string[]; recommendedAction: string } {
  const critical = collectMatches(CRITICAL_PATTERNS, text);
  if (critical.length > 0) {
    return {
      riskLevel: 'critico',
      confidence: 0.95,
      matches: critical,
      recommendedAction: 'Acionar protocolo de crise, alta gestão e porta-voz autorizado antes de qualquer resposta.',
    };
  }

  const high = collectMatches(HIGH_PATTERNS, text);
  if (high.length > 0) {
    return {
      riskLevel: 'alto',
      confidence: 0.84,
      matches: high,
      recommendedAction: 'Validar com ASCOM, diretoria responsável e área técnica antes de divulgação externa.',
    };
  }

  const medium = collectMatches(MEDIUM_PATTERNS, text);
  if (medium.length > 0) {
    return {
      riskLevel: 'medio',
      confidence: 0.66,
      matches: medium,
      recommendedAction: 'Revisar informações, confirmar fonte e manter tom institucional objetivo.',
    };
  }

  return {
    riskLevel: 'baixo',
    confidence: 0.45,
    matches: [],
    recommendedAction: 'Sem alerta sensível relevante. Seguir fluxo normal de análise.',
  };
}

export const riskQueueAgent: QueueAgentHandler = async (job, _context, _executor) => {
  if (!job.fileId || job.fileId <= 0) {
    return [{
      agent: 'riskQueueAgent',
      stage: 'risk',
      status: 'skipped',
      confidence: 0,
      summary: 'Análise de risco ignorada para estágio global.',
      recommendedAction: 'Nenhuma ação necessária.',
    }];
  }

  const text = readDocumentText(job.fileId);
  const risk = detectRisk(text);

  return [{
    agent: 'riskQueueAgent',
    stage: 'risk',
    status: 'done',
    confidence: risk.confidence,
    riskLevel: risk.riskLevel,
    summary: `Risco institucional ${risk.riskLevel}${risk.matches.length ? ` detectado por ${risk.matches.length} sinal(is).` : ' sem sinais críticos.'}`,
    recommendedAction: risk.recommendedAction,
    metadata: {
      fileId: job.fileId,
      matchedPatterns: risk.matches,
      analyzedChars: text.length,
    },
  }];
};
