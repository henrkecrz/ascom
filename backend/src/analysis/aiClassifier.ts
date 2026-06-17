import { getSetting } from '../database';
import { decrypt } from '../lib/crypto';
import { logger } from '../lib/logger';
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
    const jsonMatch = text.match(/\{[\s\S]*"docType"[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
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
  const encryptedKey = getSetting('ai_api_key');
  const apiKey = encryptedKey ? decrypt(encryptedKey) : '';
  const baseUrl = (getSetting('ai_base_url') || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
  const model = (getSetting('ai_model') || 'opencode/deepseek-v4-flash-free').replace(/^[^/]+\//, '');

  const hasValidKey = apiKey && apiKey.trim().length > 5;

  const fallback = (): AIClassificationResult => {
    const regex = regexClassify(name, text, category);
    return { ...regex, source: 'regex' };
  };

  // Expand text window up to 60k chars to take advantage of opencode 200k tokens
  const corpus = text.substring(0, 60000);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hasValidKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Nome do arquivo: ${name}\nCategoria: ${category}\n\nConteúdo do documento:\n${corpus}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      logger.warn(`AI classifier API error, falling back to regex`, { status: response.status });
      return fallback();
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallback();

    const aiResult = parseAIResponse(content);
    if (!aiResult) return fallback();

    const regexResult = regexClassify(name, text, category);

    const result: AIClassificationResult = {
      docType: aiResult.confidence >= 0.6 ? aiResult.docType : regexResult.docType,
      confidence: aiResult.confidence >= 0.6 ? aiResult.confidence : regexResult.confidence * 0.8,
      planSection: aiResult.confidence >= 0.6 ? aiResult.planSection : regexResult.planSection,
      source: aiResult.confidence >= 0.6 ? 'ai' : 'hybrid',
    };

    return result;
  } catch (e: any) {
    logger.warn('AI classifier error, falling back to regex', { message: e.message });
    return fallback();
  }
}

export { getDocTypeLabel } from './classifier';
export type { DocType } from './classifier';
