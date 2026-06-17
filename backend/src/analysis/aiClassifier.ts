import { logger } from '../lib/logger';
import { callScopedLLM } from '../services/aiProfile';
import { classifyDocument as regexClassify, DocType, ClassificationResult, getDocTypeLabel } from './classifier';

interface AIClassificationResult extends ClassificationResult {
  source: 'ai' | 'regex' | 'hybrid';
}

const SYSTEM_PROMPT = `Você é um classificador de documentos da ASCOM (Assessoria de Comunicação) da Novacap.

Classifique o documento abaixo em UM dos seguintes tipos:
- protocolo_crise: Protocolos de Crise, emergência, contingência
- fluxo_trabalho: Fluxos de Trabalho, processos, procedimentos, rotinas
- porta_voz: Porta-Vozes, quem fala pela empresa
- calendario_agenda: Calendários, agendas, cronogramas, eventos
- assunto_sensivel: Assuntos Sensíveis, confidenciais, restritos
- relatorio_atuacao: Relatórios de Atuação, balanços, resultados
- clipping_monitoramento: Clipping, monitoramento de mídia, matérias
- material_campanha: Materiais de Campanha, peças, artes, folders
- normativa_diretriz: Normativas, diretrizes, manuais, orientações
- relacionamento: Relacionamento com públicos, contatos, imprensa
- documento_administrativo: Ofícios, memorandos, atas, portarias
- outro: Qualquer outro tipo não listado

Responda APENAS com um JSON válido neste formato:
{"docType": "tipo", "confidence": 0.0-1.0, "section": "nome da seção do plano"}
A section deve ser em português, legível (ex: "Gerenciamento de Crises", "Fluxos de Trabalho").`;

function extractSectionName(docType: string): string {
  const map: Record<string, string> = {
    protocolo_crise: 'Gerenciamento de Crises',
    fluxo_trabalho: 'Fluxos de Trabalho',
    porta_voz: 'Porta-Vozes',
    calendario_agenda: 'Calendário de Eventos',
    assunto_sensivel: 'Assuntos Sensíveis',
    relatorio_atuacao: 'Relatórios',
    clipping_monitoramento: 'Clipping e Monitoramento',
    material_campanha: 'Materiais de Campanha',
    normativa_diretriz: 'Normativas e Diretrizes',
    relacionamento: 'Relacionamento com Públicos',
    documento_administrativo: 'Documentos Administrativos',
    outro: 'Geral',
  };
  return map[docType] || 'Geral';
}

function parseAIResponse(text: string): AIClassificationResult | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (parsed.docType && parsed.confidence !== undefined) {
      return {
        docType: parsed.docType as DocType,
        confidence: Math.min(Math.max(Number(parsed.confidence), 0), 1),
        planSection: parsed.section || extractSectionName(parsed.docType),
        source: 'ai',
      };
    }
  } catch {}
  return null;
}

export async function classifyWithAI(
  name: string,
  text: string,
  category: string
): Promise<AIClassificationResult> {
  const fallback = (): AIClassificationResult => {
    const regex = regexClassify(name, text, category);
    return { ...regex, source: 'regex' };
  };

  const corpus = text.substring(0, 60000);

  try {
    const content = await callScopedLLM('queue_agents', [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Nome do arquivo: ${name}\nCategoria: ${category}\n\nConteúdo do documento:\n${corpus}` },
    ], { temperature: 0.1, maxTokens: 150, timeoutMs: 15000 });

    if (!content) return fallback();

    const aiResult = parseAIResponse(content);
    if (!aiResult) return fallback();

    const regexResult = regexClassify(name, text, category);
    return {
      docType: aiResult.confidence >= 0.6 ? aiResult.docType : regexResult.docType,
      confidence: aiResult.confidence >= 0.6 ? aiResult.confidence : regexResult.confidence * 0.8,
      planSection: aiResult.confidence >= 0.6 ? aiResult.planSection : regexResult.planSection,
      source: aiResult.confidence >= 0.6 ? 'ai' : 'hybrid',
    };
  } catch (e: any) {
    logger.warn('AI classifier error, falling back to regex', { message: e.message });
    return fallback();
  }
}

export { getDocTypeLabel } from './classifier';
export type { DocType } from './classifier';
