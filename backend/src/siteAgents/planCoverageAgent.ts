import { SiteAgentHandler } from './types';
import { queryRows, scalarNumber } from './dbUtils';

const SECTIONS = [
  { id: 'crise', label: 'Gerenciamento de Crises', type: 'protocolo_crise' },
  { id: 'fluxos', label: 'Fluxos de Trabalho', type: 'fluxo_trabalho' },
  { id: 'portavoz', label: 'Porta-Vozes', type: 'porta_voz' },
  { id: 'calendario', label: 'Calendário de Eventos', type: 'calendario_agenda' },
  { id: 'sensiveis', label: 'Assuntos Sensíveis', type: 'assunto_sensivel' },
  { id: 'normativas', label: 'Normativas e Diretrizes', type: 'normativa_diretriz' },
  { id: 'campanhas', label: 'Materiais de Campanha', type: 'material_campanha' },
  { id: 'relatorios', label: 'Relatórios de Atuação', type: 'relatorio_atuacao' },
  { id: 'clipping', label: 'Clipping e Monitoramento', type: 'clipping_monitoramento' },
  { id: 'relacionamento', label: 'Relacionamento', type: 'relacionamento' },
];

export const planCoverageAgent: SiteAgentHandler = async () => {
  const sections = SECTIONS.map((section) => {
    const count = scalarNumber('SELECT COUNT(*) FROM files WHERE doc_type = ?', [section.type]);
    const withSummary = scalarNumber(`
      SELECT COUNT(*) FROM files f
      JOIN document_summary ds ON ds.file_id = f.id
      WHERE f.doc_type = ? AND ds.summary IS NOT NULL AND ds.summary != ''
    `, [section.type]);
    const examples = queryRows<any>(`
      SELECT f.id, f.name, ds.summary
      FROM files f
      LEFT JOIN document_summary ds ON ds.file_id = f.id
      WHERE f.doc_type = ?
      ORDER BY f.doc_type_confidence DESC, f.last_modified DESC
      LIMIT 3
    `, [section.type]).map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      summary: String(row.summary || '').substring(0, 160),
    }));

    const level = count >= 5 ? 'bom' : count >= 2 ? 'medio' : count >= 1 ? 'fraco' : 'vazio';
    return { ...section, count, withSummary, level, examples };
  });

  const emptySections = sections.filter((section) => section.count === 0);
  const weakSections = sections.filter((section) => section.level === 'fraco' || section.level === 'vazio');
  const strongSections = sections.filter((section) => section.level === 'bom');
  const maturity = Math.round((sections.filter((section) => section.count > 0).length / sections.length) * 100);

  return [{
    area: 'dados',
    page: 'plan',
    agent: 'planCoverageAgent',
    title: 'Cobertura do plano',
    summary: `Cobertura do plano em ${maturity}%. ${strongSections.length} seção(ões) fortes e ${weakSections.length} seção(ões) fracas ou vazias.`,
    status: emptySections.length > 0 ? 'atencao' : 'ok',
    priority: emptySections.length > 0 ? 80 : 50,
    riskLevel: emptySections.length > 0 ? 'medio' : 'baixo',
    sourceCount: sections.reduce((sum, section) => sum + section.count, 0),
    payload: {
      maturity,
      sections,
      strongSections: strongSections.map((section) => section.label),
      weakSections: weakSections.map((section) => section.label),
      emptySections: emptySections.map((section) => section.label),
      recommendedActions: weakSections.map((section) => `Reforçar documentação em: ${section.label}`),
    },
  }];
};
