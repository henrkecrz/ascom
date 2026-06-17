import { SiteAgentHandler } from './types';
import { queryRows, scalarNumber } from './dbUtils';

export const graphEnrichmentAgent: SiteAgentHandler = async () => {
  const totalDocuments = scalarNumber('SELECT COUNT(*) FROM files');
  const relationCount = scalarNumber('SELECT COUNT(*) FROM document_relations');
  const clusterCount = scalarNumber('SELECT COUNT(DISTINCT cluster_id) FROM document_clusters');
  const knowledgeRelations = scalarNumber('SELECT COUNT(*) FROM knowledge_relations');

  const strongConnections = queryRows<any>(`
    SELECT file_id_1, file_id_2, similarity_score
    FROM document_relations
    WHERE similarity_score >= 0.25
    ORDER BY similarity_score DESC
    LIMIT 10
  `).map((row) => ({
    fileId1: Number(row.file_id_1),
    fileId2: Number(row.file_id_2),
    similarity: Number(row.similarity_score || 0),
  }));

  const centralNodes = queryRows<any>(`
    SELECT file_id, COUNT(*) as degree FROM (
      SELECT file_id_1 as file_id FROM document_relations
      UNION ALL
      SELECT file_id_2 as file_id FROM document_relations
    ) x
    GROUP BY file_id
    ORDER BY degree DESC
    LIMIT 8
  `).map((row) => ({ fileId: Number(row.file_id), degree: Number(row.degree || 0) }));

  const orphanDocuments = queryRows<any>(`
    SELECT f.id, f.name, f.doc_type
    FROM files f
    WHERE NOT EXISTS (SELECT 1 FROM document_relations r WHERE r.file_id_1 = f.id OR r.file_id_2 = f.id)
    LIMIT 10
  `).map((row) => ({ id: Number(row.id), name: String(row.name), docType: String(row.doc_type || 'outro') }));

  const density = totalDocuments > 0 ? Math.round((relationCount / totalDocuments) * 100) / 100 : 0;
  const status = relationCount > 0 ? 'ok' : totalDocuments > 1 ? 'atencao' : 'vazio';

  return [{
    area: 'dados',
    page: 'graph',
    agent: 'graphEnrichmentAgent',
    title: 'Leitura inteligente do grafo',
    summary: `Grafo com ${relationCount} relação(ões), ${clusterCount} cluster(s) e ${knowledgeRelations} vínculo(s) de conhecimento.`,
    status,
    priority: status === 'ok' ? 55 : 75,
    riskLevel: status === 'atencao' ? 'medio' : 'baixo',
    sourceCount: relationCount + knowledgeRelations,
    payload: {
      totalDocuments,
      relationCount,
      clusterCount,
      knowledgeRelations,
      density,
      strongConnections,
      centralNodes,
      orphanDocuments,
      recommendedActions: orphanDocuments.length > 0
        ? ['Reprocessar relações para documentos órfãos', 'Verificar documentos com pouco texto']
        : ['Usar grafo para explorar conexões temáticas'],
    },
  }];
};
