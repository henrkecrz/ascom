import natural from 'natural';

const tokenizer = new natural.WordTokenizer();

export type DocType =
  | 'protocolo_crise'
  | 'fluxo_trabalho'
  | 'porta_voz'
  | 'calendario_agenda'
  | 'assunto_sensivel'
  | 'relatorio_atuacao'
  | 'clipping_monitoramento'
  | 'material_campanha'
  | 'normativa_diretriz'
  | 'relacionamento'
  | 'documento_administrativo'
  | 'outro';

export interface ClassificationResult {
  docType: DocType;
  confidence: number;
  planSection: string;
}

const TYPE_RULES: { type: DocType; patterns: RegExp[]; weight: number; section: string }[] = [
  { type: 'protocolo_crise', patterns: [/protocolo\s*(de\s*)?crise/i, /crise/i, /emerg[eê]ncia/i, /procedimento\s*(de\s*)?crise/i, /plano\s*(de\s*)?conting[eê]ncia/i, /gest[aã]o\s*(de\s*)?crise/i], weight: 1, section: 'Gerenciamento de Crises' },
  { type: 'fluxo_trabalho', patterns: [/fluxo/i, /processo/i, /etapa/i, /procedimento/i, /workflow/i, /rotina/i, /tr[aá]mite/i, /solicita[cç][aã]o/i, /demanda/i, /recebimento/i], weight: 1, section: 'Fluxos de Trabalho' },
  { type: 'porta_voz', patterns: [/porta[- ]?voz/i, /spokesperson/i, /designado/i, /quem\s+fala/i, /representante/i], weight: 1, section: 'Porta-Vozes' },
  { type: 'calendario_agenda', patterns: [/calend[aá]rio/i, /agenda/i, /cronograma/i, /evento/i, /datas/i, /previsto/i, /programa[cç][aã]o/i, /calend[aá]rio\s*(de\s*)?eventos/i], weight: 1, section: 'Calendário de Eventos' },
  { type: 'assunto_sensivel', patterns: [/assunto\s*sens[ií]vel/i, /sens[ií]vel/i, /confidencial/i, /reservado/i, /sigiloso/i, /tema\s*sens[ií]vel/i, /tratamento\s*especial/i], weight: 1, section: 'Assuntos Sensíveis' },
  { type: 'relatorio_atuacao', patterns: [/relat[oó]rio/i, /atua[cç][aã]o/i, /resultado/i, /balan[cç]o/i, /presta[cç][aã]o\s*(de\s*)?contas/i, /relat[oó]rio\s*(de\s*)?atividades/i], weight: 0.9, section: 'Relatórios' },
  { type: 'clipping_monitoramento', patterns: [/clipping/i, /monitoramento/i, /mat[eé]ria/i, /publica[cç][aã]o/i, /ve[ií]culo/i, /recorte/i, /m[ií]dia/i, /imprensa/i], weight: 0.9, section: 'Clipping e Monitoramento' },
  { type: 'material_campanha', patterns: [/campanha/i, /pe[cç]a/i, /arte/i, /cartaz/i, /folder/i, /banner/i, /flyer/i, /panfleto/i, /material\s*(de\s*)?comunica[cç][aã]o/i], weight: 0.9, section: 'Materiais de Campanha' },
  { type: 'normativa_diretriz', patterns: [/norma/i, /normativo/i, /diretriz/i, /orienta[cç][aã]o/i, /manual/i, /regra/i, /pol[ií]tica/i, /procedimento\s*(de\s*)?trabalho/i], weight: 1, section: 'Normativas e Diretrizes' },
  { type: 'relacionamento', patterns: [/contato/i, /lista\s*(de\s*)?contatos/i, /parceiro/i, /imprensa/i, /relacionamento/i, /p[iú]blico/i, /stakeholder/i, /audi[eê]ncia/i], weight: 0.8, section: 'Relacionamento com Públicos' },
  { type: 'documento_administrativo', patterns: [/of[ií]cio/i, /memorando/i, /ata/i, /despacho/i, /portaria/i, /resolu[cç][aã]o/i, /circular/i, /comunicado/i, /informe/i], weight: 0.8, section: 'Documentos Administrativos' },
];

const SECTION_RULES: { section: string; patterns: RegExp[] }[] = [
  { section: 'Gerenciamento de Crises', patterns: [/crise/i, /crises/i, /protocolo/i, /conting[eê]ncia/i, /emerg[eê]ncia/i] },
  { section: 'Fluxos de Trabalho', patterns: [/fluxo/i, /processo/i, /solicita[cç][aã]o/i, /demanda/i, /recebimento/i, /atendimento/i] },
  { section: 'Porta-Vozes', patterns: [/porta[- ]?voz/i, /fal[aã]o/i, /entrevista/i, /coletiva/i] },
  { section: 'Calendário de Eventos', patterns: [/calend[aá]rio/i, /evento/i, /agenda/i, /cronograma/i, /datas\s*comemorativas/i] },
  { section: 'Assuntos Sensíveis', patterns: [/sens[ií]vel/i, /sigiloso/i, /confidencial/i, /restrito/i] },
  { section: 'Relacionamento com Imprensa', patterns: [/imprensa/i, /m[ií]dia/i, /jornalista/i, /ve[ií]culo/i, /assessoria\s*(de\s*)?imprensa/i] },
  { section: 'Comunicação Interna', patterns: [/comunica[cç][aã]o\s*interna/i, /endomarketing/i, /funcion[aá]rio/i, /colaborador/i, /intranet/i] },
  { section: 'Eventos', patterns: [/evento/i, /solenidade/i, /cerim[oô]nia/i, /inaugura[cç][aã]o/i, /comemora[cç][aã]o/i] },
  { section: 'Redes Sociais', patterns: [/rede\s*social/i, /m[ií]dia\s*social/i, /instagram/i, /linkedin/i, /facebook/i, /youtube/i, /twitter/i] },
];

export function classifyDocument(name: string, text: string, category: string): ClassificationResult {
  const corpus = `${name} ${text} ${category}`.toLowerCase();

  let bestType: DocType = 'outro';
  let bestScore = 0;
  let bestSection = 'Geral';

  for (const rule of TYPE_RULES) {
    let matches = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(corpus)) matches++;
    }
    if (matches > 0) {
      const score = (matches / rule.patterns.length) * rule.weight;
      if (score > bestScore) {
        bestScore = score;
        bestType = rule.type;
        bestSection = rule.section;
      }
    }
  }

  let sectionScore = 0;
  for (const rule of SECTION_RULES) {
    let matches = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(corpus)) matches++;
    }
    if (matches > sectionScore) {
      sectionScore = matches;
      bestSection = rule.section;
    }
  }

  if (bestType === 'outro' && category) {
    if (/crise/i.test(category)) { bestType = 'protocolo_crise'; bestScore = 0.5; }
    else if (/fluxo/i.test(category)) { bestType = 'fluxo_trabalho'; bestScore = 0.5; }
    else if (/calend/i.test(category)) { bestType = 'calendario_agenda'; bestScore = 0.5; }
    else if (/relat/i.test(category)) { bestType = 'relatorio_atuacao'; bestScore = 0.5; }
    else if (/norma/i.test(category)) { bestType = 'normativa_diretriz'; bestScore = 0.5; }
    else if (/clip/i.test(category)) { bestType = 'clipping_monitoramento'; bestScore = 0.5; }
  }

  return {
    docType: bestType,
    confidence: Math.min(bestScore, 1),
    planSection: bestSection,
  };
}

export function getDocTypeLabel(type: DocType): string {
  const labels: Record<DocType, string> = {
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
  return labels[type];
}

export const DOC_TYPES = TYPE_RULES.map(r => r.type);
