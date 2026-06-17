import { getDynamicTables } from '../analysis/dynamicTableGenerator';
import { getValidatedRelationships } from '../analysis/relationshipFinder';
import { AgentRequest, AgentResponse } from './types';

export async function dataAgent(_request: AgentRequest): Promise<AgentResponse> {
  const tables = getDynamicTables();
  const relationships = getValidatedRelationships();

  const tableLines = tables.slice(0, 10).map((table: any) => {
    const cols = Array.isArray(table.columns) ? table.columns.length : 0;
    return `- **${table.name || table.tableName}**: ${cols} colunas`;
  });

  return {
    agent: 'data_agent',
    title: 'Agente de Dados e Planilhas',
    answer: tableLines.length > 0
      ? `Encontrei ${tables.length} tabela(s) dinâmica(s) importada(s).\n\n${tableLines.join('\n')}\n\nRelacionamentos validados: ${relationships.length}.`
      : 'Ainda não encontrei tabelas dinâmicas importadas. Use o importador inteligente para processar planilhas, CSVs ou tabelas extraídas de documentos.',
    confidence: tables.length > 0 ? 0.75 : 0.45,
    sources: ['dynamicTableGenerator', 'relationshipFinder'],
    recommendedActions: tables.length > 0
      ? ['Abrir a área de dados estruturados', 'Validar schemas importados', 'Criar visualização ou relatório a partir das tabelas']
      : ['Importar uma fonte de dados', 'Usar preview antes de confirmar a importação'],
    metadata: {
      tablesCount: tables.length,
      relationshipsCount: relationships.length,
    },
  };
}
