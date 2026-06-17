import { processQuestion } from '../services/consultService';
import { AgentRequest, AgentResponse } from './types';
import { callAgentLLM } from './llmClient';

function getContentLabel(type?: string): string {
  const labels: Record<string, string> = {
    release: 'release institucional',
    nota: 'nota oficial',
    whatsapp: 'texto para WhatsApp',
    instagram: 'legenda para Instagram',
    comunicado: 'comunicado interno',
    briefing: 'briefing executivo',
  };
  return labels[type || ''] || 'texto institucional';
}

export async function contentAgent(request: AgentRequest): Promise<AgentResponse> {
  const contentType = request.context?.contentType || 'nota';
  const consult = await processQuestion(`Busque contexto documental para produzir ${getContentLabel(contentType)} sobre: ${request.question}`);

  const contextDocs = (consult.documents || [])
    .slice(0, 5)
    .map((doc: any, index: number) => `[Doc ${index + 1}] ${doc.name}\nResumo: ${doc.summary || 'Sem resumo'}\nConteúdo: ${(doc.rawText || '').substring(0, 1000)}`)
    .join('\n\n');

  const generated = await callAgentLLM([
    {
      role: 'system',
      content: `Você é um redator institucional da ASCOM/Novacap. Produza textos claros, objetivos, factuais e alinhados à comunicação pública. Não invente dados. Quando faltar informação, indique que precisa de validação.`,
    },
    {
      role: 'user',
      content: `Tipo de conteúdo: ${getContentLabel(contentType)}\nPedido: ${request.question}\n\nContexto documental:\n${contextDocs || consult.answer}\n\nGere o texto final pronto para uso.`,
    },
  ], { temperature: 0.35, maxTokens: 1200 });

  const fallback = `Sugestão de ${getContentLabel(contentType)}:\n\n${consult.answer}\n\nObservação: revise dados, datas, nomes e números antes da publicação.`;

  return {
    agent: 'content_agent',
    title: 'Agente Gerador de Conteúdo',
    answer: generated || fallback,
    confidence: generated ? 0.82 : 0.58,
    documents: (consult.documents || []).slice(0, 10).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      docType: doc.docType,
      planSection: doc.planSection,
      summary: doc.summary,
    })),
    sources: ['consultService', generated ? 'agent_llm' : 'fallback_template', consult.source].filter(Boolean),
    recommendedActions: [
      'Revisar dados sensíveis antes de publicar',
      'Validar nomes, cargos, datas e números',
      'Submeter à aprovação quando envolver crise ou assunto sensível',
    ],
    metadata: {
      contentType,
      consultIntent: consult.intent,
      generatedWithLLM: Boolean(generated),
    },
  };
}
