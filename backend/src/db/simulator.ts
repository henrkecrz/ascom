import { getDatabase, saveDatabase } from './connection';

export interface ScenarioOption {
  id: string;
  text: string;
  points: number;
  feedback: string;
}

export interface Scenario {
  id: number;
  title: string;
  description: string;
  options: ScenarioOption[];
  difficulty: string;
  category: string;
  source: string;
  created_at: string;
}

export function ensureSimulatorTable(): void {
  const db = getDatabase();
  if (!db) return;
  db.run(`CREATE TABLE IF NOT EXISTS simulator_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    options TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medio',
    category TEXT DEFAULT 'geral',
    source TEXT DEFAULT 'ai',
    created_at TEXT
  )`);
}

export function insertScenario(s: Omit<Scenario, 'id' | 'created_at'>): number {
  const db = getDatabase();
  if (!db) return 0;
  const now = new Date().toISOString();
  db.run(`INSERT INTO simulator_scenarios (title, description, options, difficulty, category, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [s.title, s.description, JSON.stringify(s.options), s.difficulty, s.category, s.source, now]);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  if (r.length > 0 && r[0].values.length > 0) return Number(r[0].values[0][0]);
  return 0;
}

export function getScenarios(category?: string): Scenario[] {
  const db = getDatabase();
  if (!db) return [];
  const sql = category
    ? 'SELECT * FROM simulator_scenarios WHERE category = ? ORDER BY id DESC'
    : 'SELECT * FROM simulator_scenarios ORDER BY id DESC';
  const stmt = db.prepare(sql);
  if (category) stmt.bind([category]);
  const results: Scenario[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      title: String(row.title),
      description: String(row.description),
      options: JSON.parse(String(row.options || '[]')),
      difficulty: String(row.difficulty || 'medio'),
      category: String(row.category || 'geral'),
      source: String(row.source || 'ai'),
      created_at: String(row.created_at || ''),
    });
  }
  stmt.free();
  return results;
}

export function getScenarioCategories(): { category: string; count: number }[] {
  const db = getDatabase();
  if (!db) return [];
  const stmt = db.prepare('SELECT category, COUNT(*) as count FROM simulator_scenarios GROUP BY category ORDER BY count DESC');
  const results: { category: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    results.push({ category: String(row.category), count: Number(row.count) });
  }
  stmt.free();
  return results;
}

export function deleteScenario(id: number): void {
  const db = getDatabase();
  if (!db) return;
  db.run('DELETE FROM simulator_scenarios WHERE id = ?', [id]);
  saveDatabase();
}

// ── Keyword-based category classification ──────────────────────────

interface CategoryRule {
  category: string;
  patterns: RegExp[];
  weight: number;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'obras_infraestrutura',
    weight: 1,
    patterns: [
      /asfalto/i, /buraco/i, /paviment/i, /cal[cç]ada/i, /\bobra\b/i, /\bobras\b/i,
      /desabamento/i, /desmoron/i, /ponte\b/i, /viaduto/i, /rachadura/i, /trinca/i,
      /constru[cç][aã]o/i, /edifica[cç]/i, /demoli[cç]/i, /reparo/i,
      /manuten[cç][aã]o\s*(predial|urbana|vi[aá]ria)/i, /infraestrutura/i,
      /recapeamento/i, /tapa.?buraco/i, /urbaniza[cç]/i, /terraplanagem/i,
      /drenagem\s*urbana/i, /\bvia\b/i, /\bvias\b/i, /estrada/i, /rodovia/i,
      /lote\b/i, /loteamento/i, /galeria/i, /bueiro/i, /sarjeta/i,
      /rede\s*(de\s*)?(esgoto|[aá]gua)/i, /tubula[cç]/i, /vazamento\s*(de\s*)?[aá]gua/i,
      /rompi?mento\s*(de\s*)?(adutora|tubula)/i, /cratera/i, /afundamento/i,
      /sobrecarga\s*estrutural/i, /piso\s*danificado/i, /muro\s*(ca[ií]|desab)/i,
    ],
  },
  {
    category: 'meio_ambiente_saneamento',
    weight: 1,
    patterns: [
      /[aá]rvore/i, /poda/i, /alagamento/i, /drenagem\s*pluvial/i,
      /parque/i, /jardim/i, /[aá]rea\s*verde/i, /enchente/i, /inunda[cç]/i,
      /meio\s*ambiente/i, /ambiental/i, /saneamento/i, /esgoto/i,
      /c[oó]rrego/i, /eros[aã]o/i, /desmata/i, /desflore/i,
      /lixo/i, /res[ií]duo/i, /fauna/i, /flora/i, /queimada/i,
      /inc[eê]ndio\s*(florestal|ambiental|em\s*vegeta)/i,
      /contamina[cç]/i, /polui[cç]/i, /manancial/i, /nascente/i,
      /lago/i, /lagoa/i, /reservat[oó]rio/i, /aterro\s*sanit/i,
      /descarte\s*(irregular|ilegal)/i, /coleta\s*(de\s*)?(lixo|res[ií]duo)/i,
      /animal\s*(silvestre|morto|atropel)/i, /app\b/i, /mata\s*ciliar/i,
      /assoreamento/i, /cheias?\b/i, /temporal/i, /chuvas?\s*forte/i,
    ],
  },
  {
    category: 'atendimento_imprensa',
    weight: 1,
    patterns: [
      /imprensa/i, /jornalista/i, /rep[oó]rter/i, /m[ií]dia/i, /fake\s*news/i,
      /vazamento\s*(de\s*)?(informa|dados|documento)/i, /entrevista/i, /coletiva/i,
      /nota\s*(oficial|[aà]\s*imprensa)/i, /press\s*release/i, /release/i,
      /mat[eé]ria/i, /reportagem/i, /televis[aã]o/i, /\btv\b/i, /r[aá]dio/i,
      /jornal\b/i, /rede\s*social/i, /viral/i, /comunicado/i, /declara[cç][aã]o/i,
      /assessoria\s*(de\s*)?comunica/i, /resposta\s*[àa]\s*imprensa/i,
      /porta.?voz/i, /interlocu[cç]/i, /repercuss[aã]o/i, /crise\s*(de\s*)?imagem/i,
      /desinforma[cç]/i, /boato/i, /exposi[cç][aã]o\s*negativa/i,
      /manchete/i, /editorial/i, /opini[aã]o\s*p[uú]blica/i, /trending/i,
      /hashtag/i, /viraliz/i, /influenciador/i, /youtuber/i, /blogueiro/i,
      /\bascom\b/i, /comunica[cç][aã]o\s*(social|institucional|corporativa)/i,
      /crise\s*de\s*comunica/i, /gest[aã]o\s*de\s*(crise|imagem)/i,
      /silenciar/i, /omiss[aã]o/i, /transpar[eê]ncia/i, /posicionamento/i,
      /retra[cç][aã]o/i, /desmentir/i, /esclarecimento/i, /nota\s*de\s*repúdio/i,
    ],
  },
  {
    category: 'gestao_governanca',
    weight: 1,
    patterns: [
      /greve/i, /manifesta[cç]/i, /licita[cç]/i, /contrato/i, /sindic[aâ]ncia/i,
      /investiga[cç]/i, /auditoria/i, /terceirizado/i, /concurso/i,
      /corrup[cç]/i, /[eé]tica/i, /governan[cç]a/i,
      /pol[ií]tic/i, /tribunal/i, /\btcu\b/i, /\btcdf\b/i, /legislativ/i,
      /or[cç]amento/i, /recurso\s*p[uú]blico/i, /gest[aã]o\s*(p[uú]blica|administrativa)/i,
      /irregularidade/i, /den[uú]ncia/i, /nepotismo/i, /desvio/i, /fraude/i,
      /superfaturamento/i, /sobrepreço/i, /improbidade/i, /dispensa\s*(de\s*)?licita/i,
      /preg[aã]o/i, /edital/i, /aditivo/i, /inexigibilidade/i,
      /minist[eé]rio\s*p[uú]blico/i, /\bmp\b/i, /pol[ií]cia\s*(civil|federal)/i,
      /opera[cç][aã]o\s*(policial|federal)/i, /cpi\b/i, /comiss[aã]o/i,
      /exonera[cç]/i, /nomea[cç]/i, /cargo\s*(comissionado|em\s*comiss)/i,
      /gest[aã]o\s*de\s*pessoal/i, /paralis/i, /greve\s*(de\s*)?funcion/i,
      /servidor/i, /empregado\s*p[uú]blico/i, /sindicato/i,
      /lei\s*de\s*(acesso|responsabilidade)/i, /compliance/i,
    ],
  },
  {
    category: 'seguranca_saude',
    weight: 1,
    patterns: [
      /acidente\s*(de\s*trabalho|fatal|grave)?/i, /seguran[cç]a\s*(do\s*trabalho|ocupacional|p[uú]blica)/i,
      /interdi[cç][aã]o/i, /sinaliza[cç]/i, /\bepi\b/i, /sa[uú]de/i,
      /ocupacional/i, /morte/i, /ferido/i, /v[ií]tima/i, /\brisco\b/i,
      /perigo/i, /inc[eê]ndio\b/i, /queda\b/i, /el[eé]tric/i, /soterramento/i,
      /choque\s*(el[eé]trico)?/i, /explos[aã]o/i, /desabamento\s*(de\s*)?estrut/i,
      /intoxica[cç]/i, /contamina[cç][aã]o\s*(qu[ií]mica|por\s*produto)/i,
      /ambulância/i, /samu\b/i, /bombeiro/i, /resgate/i,
      /norma\s*regulament/i, /\bnr\s*\d/i, /cipa\b/i, /\bsesmt\b/i,
      /equipamento\s*de\s*prote/i, /capacete/i, /isolamento/i,
      /\bcovid/i, /pandemia/i, /epidemia/i, /surto/i, /dengue/i,
      /atropelamento/i, /colis[aã]o/i, /capotamento/i, /trânsito/i,
    ],
  },
];

/**
 * Classifies a scenario's text (title + description + options) into one of 5 operational categories.
 * Returns the best-match category or 'geral' if no strong match is found.
 */
export function classifyScenarioText(title: string, description: string, optionsText: string): string {
  const fullText = `${title} ${description} ${optionsText}`.toLowerCase();

  const scores: Record<string, number> = {};
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const pattern of rule.patterns) {
      const matches = fullText.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        score += matches.length * rule.weight;
      }
    }
    if (score > 0) {
      scores[rule.category] = score;
    }
  }

  const entries = Object.entries(scores);
  if (entries.length === 0) return 'geral';

  entries.sort((a, b) => b[1] - a[1]);

  // Only assign if the top score is meaningful (at least 2 keyword hits)
  if (entries[0][1] >= 2) {
    return entries[0][0];
  }

  // Single hit: assign only if there's no ambiguity
  if (entries.length === 1 && entries[0][1] >= 1) {
    return entries[0][0];
  }

  return 'geral';
}

/**
 * Reclassifies ALL scenarios currently tagged as 'geral' using keyword matching.
 * Returns { updated, unchanged, total }.
 */
export function reclassifyAllScenarios(): { updated: number; unchanged: number; total: number; distribution: Record<string, number> } {
  const db = getDatabase();
  if (!db) return { updated: 0, unchanged: 0, total: 0, distribution: {} };

  // Fetch all scenarios (not just 'geral' — reclassify everything for consistency)
  const stmt = db.prepare('SELECT id, title, description, options, category FROM simulator_scenarios');
  const rows: { id: number; title: string; description: string; options: string; oldCategory: string }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    rows.push({
      id: Number(row.id),
      title: String(row.title || ''),
      description: String(row.description || ''),
      options: String(row.options || '[]'),
      oldCategory: String(row.category || 'geral'),
    });
  }
  stmt.free();

  let updated = 0;
  let unchanged = 0;
  const distribution: Record<string, number> = {};

  for (const row of rows) {
    // Extract options text for classification
    let optionsText = '';
    try {
      const opts = JSON.parse(row.options) as { text?: string; feedback?: string }[];
      optionsText = opts.map(o => `${o.text || ''} ${o.feedback || ''}`).join(' ');
    } catch { /* ignore */ }

    const newCategory = classifyScenarioText(row.title, row.description, optionsText);
    distribution[newCategory] = (distribution[newCategory] || 0) + 1;

    if (newCategory !== row.oldCategory) {
      db.run('UPDATE simulator_scenarios SET category = ? WHERE id = ?', [newCategory, row.id]);
      updated++;
    } else {
      unchanged++;
    }
  }

  saveDatabase();

  return { updated, unchanged, total: rows.length, distribution };
}
