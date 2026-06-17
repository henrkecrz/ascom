import { processQuestion } from '../services/consultService';
import { AgentRequest, AgentResponse } from './types';

function mapDocuments(docs: any[] = []) {
  return docs.slice(0, 10).map((doc) => ({
    id: doc.id,
    name: doc.name,
    docType: doc.docType,
    planSection: doc.planSection,
    summary: doc.summary,
  }));
}

export async function documentAgent(request: AgentRequest): Promise<AgentResponse> {
  const result = await processQuestion(request.question);

  return {
    agent: 'document_agent',
    title: 'Agente Documental',
    answer: result.answer,
    confidence: result.documents?.length ? 0.82 : 0.45,
    documents: mapDocuments(result.documents),
    sources: ['consultService', result.source].filter(Boolean),
    recommendedActions: result.documents?.length
      ? ['Abrir os documentos relacionados', 'Validar o trecho antes de usar em resposta oficial']
      : ['Reformular a busca com termos mais específicos'],
    metadata: {
      intent: result.intent,
      source: result.source,
    },
  };
}
