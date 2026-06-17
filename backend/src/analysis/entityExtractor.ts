import natural from 'natural';

const tokenizer = new natural.WordTokenizer();

export interface ExtractedEntities {
  persons: string[];
  organizations: string[];
  dates: { text: string; normalized?: string }[];
  values: string[];
  programs: string[];
  mediaVehicles: string[];
  locations: string[];
}

const ORG_PATTERNS = [
  /Novacap/gi, /ASCOM/gi, /Companhia\s+(de\s+)?/gi, /Secretaria/gi, /Minist[eé]rio/gi,
  /Governo/gi, /Prefeitura/gi, /C[aâ]mara/gi, /Senado/gi, /Tribunal/gi,
  /Presid[eê]ncia/gi, /Gabinete/gi, /Diretoria/gi, /Superintend[eê]ncia/gi,
  /Associa[cç][aã]o/gi, /Sindicato/gi, /Instituto/gi, /Funda[cç][aã]o/gi,
];

const VALUE_PATTERNS = [
  /R?\$[\s]?[\d.,]+/g, /\d+[\.,]\d{3}[\.,]\d{2}/g,
  /[\d.]+\s*(milh[ãa]o|mil|bilh[ãa]o)/gi,
];

const PROGRAM_PATTERNS = [
  /Programa\s+[A-Z][a-záéíóúâêîôûãõç]+/g, /Projeto\s+[A-Z][a-záéíóúâêîôûãõç]+/g,
  /Campanha\s+[A-Z][a-záéíóúâêîôûãõç]+/g, /Plano\s+[A-Z][a-záéíóúâêîôûãõç]+/g,
  /Pacto\s+[A-Z][a-záéíóúâêîôûãõç]+/g, /Sistema\s+[A-Z][a-záéíóúâêîôûãõç]+/g,
];

const MEDIA_PATTERNS = [
  /Jornal\s+[A-Z][a-záéíóú]+/g, /TV\s+[A-Z][a-záéíóú]+/g,
  /R[aá]dio\s+[A-Z][a-záéíóú]+/g, /Revista\s+[A-Z][a-záéíóú]+/g,
  /Portal\s+[A-Z][a-záéíóú]+/g,
];

const DATE_PATTERNS = [
  /\d{2}[./]\d{2}[./]\d{4}/g, /\d{4}[./-]\d{2}[./-]\d{2}/g,
  /\d{1,2}\s+de\s+[a-záéíóúâêîôûãõç]+\s+de\s+\d{4}/gi,
];

const PERSON_CONTEXT = [
  /[Dd]r\.?\s+[A-Z][a-z]+/g, /[Ee]ng\.?\s+[A-Z][a-z]+/g,
  /[Pp]residente\s+[A-Z][a-z]+/g, /[Dd]iretor[a]?\s+[A-Z][a-z]+/g,
  /[Ss]uperintendente\s+[A-Z][a-z]+/g, /[Gg]erente\s+[A-Z][a-z]+/g,
  /[Cc]oordenador[a]?\s+[A-Z][a-z]+/g, /[Aa]ssessor[a]?\s+[A-Z][a-z]+/g,
  /[Ss]ecret[aá]rio[a]?\s+[A-Z][a-z]+/g, /[Mm]inistro[a]?\s+[A-Z][a-z]+/g,
];

export function extractEntities(text: string): ExtractedEntities {
  const entities: ExtractedEntities = {
    persons: [],
    organizations: [],
    dates: [],
    values: [],
    programs: [],
    mediaVehicles: [],
    locations: [],
  };

  for (const pattern of ORG_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const clean = m.trim();
        if (!entities.organizations.includes(clean)) entities.organizations.push(clean);
      }
    }
  }

  for (const pattern of VALUE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        if (!entities.values.includes(m.trim())) entities.values.push(m.trim());
      }
    }
  }

  for (const pattern of PROGRAM_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const clean = m.trim();
        if (!entities.programs.includes(clean)) entities.programs.push(clean);
      }
    }
  }

  for (const pattern of MEDIA_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const clean = m.trim();
        if (!entities.mediaVehicles.includes(clean)) entities.mediaVehicles.push(clean);
      }
    }
  }

  for (const pattern of DATE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const exists = entities.dates.some(d => d.text === m.trim());
        if (!exists) entities.dates.push({ text: m.trim() });
      }
    }
  }

  for (const pattern of PERSON_CONTEXT) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const clean = m.trim();
        if (!entities.persons.includes(clean)) entities.persons.push(clean);
      }
    }
  }

  const locationKeywords = /(?:em\s+)?([A-Z][a-záéíóúâêîôûãõç]+(?:\s+[A-Z][a-záéíóúâêîôûãõç]+)?)(?:\s*[,;]\s*)?(?:[A-Z]{2}\b)?/g;
  const knownLocations = ['Brasília', 'DF', 'Distrito Federal', 'Brasil', 'São Paulo', 'Rio de Janeiro', 'Goiânia', 'Belo Horizonte'];
  for (const loc of knownLocations) {
    if (text.includes(loc) && !entities.locations.includes(loc)) {
      entities.locations.push(loc);
    }
  }

  entities.persons = [...new Set(entities.persons)].slice(0, 20);
  entities.organizations = [...new Set(entities.organizations)].slice(0, 20);
  entities.dates = entities.dates.slice(0, 20);
  entities.values = [...new Set(entities.values)].slice(0, 10);
  entities.programs = [...new Set(entities.programs)].slice(0, 10);
  entities.mediaVehicles = [...new Set(entities.mediaVehicles)].slice(0, 10);
  entities.locations = [...new Set(entities.locations)].slice(0, 10);

  return entities;
}

export async function extractEntitiesAsync(text: string): Promise<ExtractedEntities> {
  const entities = extractEntities(text); // Baseline from Regex

  try {
    const res = await fetch('http://localhost:8000/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (res.ok) {
      const json = await res.json() as any;
      if (json.entities) {
        for (const ent of json.entities) {
          const t = ent.text.trim();
          if (ent.label === 'PER' && !entities.persons.includes(t)) entities.persons.push(t);
          if (ent.label === 'ORG' && !entities.organizations.includes(t)) entities.organizations.push(t);
          if (ent.label === 'LOC' && !entities.locations.includes(t)) entities.locations.push(t);
        }
        
        entities.persons = [...new Set(entities.persons)].slice(0, 20);
        entities.organizations = [...new Set(entities.organizations)].slice(0, 20);
        entities.locations = [...new Set(entities.locations)].slice(0, 10);
      }
    }
  } catch (err) {
    const { logger } = require('../lib/logger');
    logger.warn('Python entity extractor falhou', { error: (err as Error).message });
  }

  return entities;
}

export function serializeEntities(entities: ExtractedEntities): string {
  return JSON.stringify(entities);
}

export function parseEntities(str: string): ExtractedEntities {
  try {
    return JSON.parse(str);
  } catch {
    return { persons: [], organizations: [], dates: [], values: [], programs: [], mediaVehicles: [], locations: [] };
  }
}
