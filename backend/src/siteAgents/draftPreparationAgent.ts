import { SiteAgentHandler } from './types';
import { queryRows } from './dbUtils';

export const draftPreparationAgent: SiteAgentHandler = async () => {
  const candidates = queryRows<any>(`
    SELECT f.id, f.name, f.doc_type, f.category, f.last_modified, ds.summary, ds.keywords
    FROM files f
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    WHERE f.doc_type IN ('relatorio_atuacao', 'material_campanha', 'clipping_monitoramento', 'assunto_sensivel', 'documento_administrativo')
       OR f.last_modified IS NOT NULL
    ORDER BY f.last_modified DESC
    LIMIT 12
  `).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    docType: String(row.doc_type || 'outro'),
    category: String(row.category || ''),
    lastModified: String(row.last_modified || ''),
    summary: String(row.summary || '').substring(0, 300),
    keywords: String(row.keywords || '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 8),
  }));

  const suggestions = candidates.slice(0, 6).map((doc) => ({
    type: doc.docType === 'assunto_sensivel' ? 'nota' : 'release',
    title: doc.name.replace(/\.[^.]+$/, ''),
    sourceDocuments: [doc.id],
    facts: doc.keywords.length ? doc.keywords : ['contexto', 'benefício', 'local', 'ação institucional'],
    status: doc.summary ? 'pronto_para_rascunho' : 'precisa_contexto',
    summary: doc.summary,
  }));

  return [{
    area: 'ferramentas',
    page: 'generator',
    agent: 'draftPreparationAgent',
    title: 'Sugestões para rascunhar',
    summary: suggestions.length > 0 ? `${suggestions.length} sugestão(ões) de conteúdo preparadas para rascunho.` : 'Nenhuma sugestão de conteúdo encontrada no momento.',
    status: suggestions.length > 0 ? 'ok' : 'vazio',
    priority: suggestions.length > 0 ? 60 : 20,
    riskLevel: null,
    sourceCount: candidates.length,
    payload: {
      suggestions,
      candidates,
      recommendedActions: suggestions.length > 0
        ? ['Abrir Rascunhar e selecionar uma sugestão', 'Validar dados antes de publicar']
        : ['Processar mais documentos ou importar fontes de pauta'],
    },
  }];
};
