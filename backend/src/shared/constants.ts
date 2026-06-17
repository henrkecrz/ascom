export const DOC_TYPE_LABELS: Record<string, string> = {
  protocolo_crise: 'Protocolo de Crise',
  fluxo_trabalho: 'Fluxo de Trabalho',
  porta_voz: 'Porta-Voz',
  calendario_agenda: 'Calendário/Agenda',
  assunto_sensivel: 'Assunto Sensível',
  relatorio_atuacao: 'Relatório de Atuação',
  clipping_monitoramento: 'Clipping/Monitoramento',
  material_campanha: 'Material de Campanha',
  normativa_diretriz: 'Normativa/Diretriz',
  relacionamento: 'Relacionamento',
  documento_administrativo: 'Documento Administrativo',
  outro: 'Outro',
};

export const DOC_TYPE_TO_SECTION: Record<string, string> = {
  protocolo_crise: 'Gerenciamento de Crises',
  fluxo_trabalho: 'Fluxos de Trabalho',
  porta_voz: 'Porta-Vozes',
  calendario_agenda: 'Calendário de Eventos',
  assunto_sensivel: 'Assuntos Sensíveis',
  relatorio_atuacao: 'Relatórios de Atuação',
  clipping_monitoramento: 'Clipping e Monitoramento',
  material_campanha: 'Materiais de Campanha',
  normativa_diretriz: 'Normativas e Diretrizes',
  relacionamento: 'Relacionamento com Públicos',
  documento_administrativo: 'Documentos Administrativos',
  outro: 'Geral',
};

export const SECTION_ORDER = [
  'protocolo_crise',
  'fluxo_trabalho',
  'porta_voz',
  'calendario_agenda',
  'assunto_sensivel',
  'normativa_diretriz',
  'material_campanha',
  'relatorio_atuacao',
  'clipping_monitoramento',
  'relacionamento',
  'documento_administrativo',
  'outro',
];

export const CRITICAL_SECTIONS = ['protocolo_crise', 'porta_voz'];

export const REQUIRED_SECTIONS = ['protocolo_crise', 'porta_voz', 'calendario_agenda', 'fluxo_trabalho'];

export const SECTION_COLORS: Record<string, string> = {
  crise: '#ef4444',
  fluxos: '#3b82f6',
  portavoz: '#8b5cf6',
  calendario: '#10b981',
  sensiveis: '#f59e0b',
  relatorios: '#06b6d4',
  normativas: '#ec4899',
  campanhas: '#f97316',
};

export const STALE_MONTHS = 6;
export const MAX_RECENT_DOCS = 5;
export const AI_TIMEOUT_MS = 15000;
export const AI_DEFAULT_TEMPERATURE = 0.1;
export const AI_MAX_TOKENS = 150;
export const AI_CLASSIFY_TEXT_LIMIT = 3000;
export const CONSULT_TEXT_LIMIT = 1200;
export const SOCIAL_WORD_MIN_LENGTH = 3;
