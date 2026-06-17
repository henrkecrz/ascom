import { getDynamicTables } from '../analysis/dynamicTableGenerator';
import { SiteAgentHandler } from './types';
import { pct, scalarNumber } from './dbUtils';

export const dataQualityAgent: SiteAgentHandler = async () => {
  const totalDocuments = scalarNumber('SELECT COUNT(*) FROM files');
  const withoutText = scalarNumber(`
    SELECT COUNT(*) FROM files f
    LEFT JOIN document_text dt ON dt.file_id = f.id
    WHERE dt.file_id IS NULL OR dt.status IN ('empty', 'error', 'skipped')
  `);
  const withoutSummary = scalarNumber(`
    SELECT COUNT(*) FROM files f
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    WHERE ds.file_id IS NULL OR ds.summary IS NULL OR ds.summary = ''
  `);
  const withoutClassification = scalarNumber("SELECT COUNT(*) FROM files WHERE doc_type IS NULL OR doc_type = '' OR doc_type = 'outro'");
  const lowConfidence = scalarNumber('SELECT COUNT(*) FROM files WHERE doc_type_confidence > 0 AND doc_type_confidence < 0.6');
  const withoutEntities = scalarNumber("SELECT COUNT(*) FROM files WHERE entities IS NULL OR entities = '' OR entities = '{}'");
  const dynamicTables = getDynamicTables();
  const emptyTables = dynamicTables.filter((table: any) => Number(table.rowCount || 0) === 0).length;

  const issues = [
    { key: 'withoutText', label: 'Documentos sem texto útil', count: withoutText },
    { key: 'withoutSummary', label: 'Documentos sem resumo', count: withoutSummary },
    { key: 'withoutClassification', label: 'Documentos sem classificação clara', count: withoutClassification },
    { key: 'lowConfidence', label: 'Classificações com baixa confiança', count: lowConfidence },
    { key: 'withoutEntities', label: 'Documentos sem entidades', count: withoutEntities },
    { key: 'emptyTables', label: 'Tabelas dinâmicas vazias', count: emptyTables },
  ].filter((issue) => issue.count > 0);

  const qualityScore = Math.max(0, 100 - pct(withoutText + withoutSummary + lowConfidence, Math.max(1, totalDocuments * 3)) * 100 / 100);
  const status = issues.length === 0 ? 'ok' : issues.some((i) => ['withoutText', 'withoutClassification'].includes(i.key) && i.count > 5) ? 'atencao' : 'atencao';

  return [{
    area: 'dados',
    page: 'health',
    agent: 'dataQualityAgent',
    title: 'Qualidade da base',
    summary: issues.length > 0 ? `${issues.length} tipo(s) de problema de qualidade encontrados.` : 'Base sem problemas relevantes de qualidade.',
    status,
    priority: issues.length > 0 ? 85 : 40,
    riskLevel: issues.length > 0 ? 'medio' : 'baixo',
    sourceCount: totalDocuments,
    payload: {
      totalDocuments,
      qualityScore: Math.round(qualityScore),
      issues,
      metrics: {
        withoutText,
        withoutSummary,
        withoutClassification,
        lowConfidence,
        withoutEntities,
        dynamicTables: dynamicTables.length,
        emptyTables,
      },
      recommendedActions: issues.map((issue) => `Resolver: ${issue.label} (${issue.count})`),
    },
  }];
};
