import { getDatabase } from '../database';
import { STOPWORDS_PT } from '../shared/stopwords';

const SEARCH_LIMIT = 30;
const SNIPPET_CONTEXT = 150;

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-záéíóúâêîôûãõàçA-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS_PT.has(t));
}

function extractSnippet(text: string, queryTokens: string[], contextChars: number = SNIPPET_CONTEXT): string {
  const lower = text.toLowerCase();
  let bestPos = -1;
  let bestScore = 0;

  for (const token of queryTokens) {
    const pos = lower.indexOf(token);
    if (pos >= 0) {
      let score = 0;
      for (const t of queryTokens) {
        if (lower.includes(t)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }
  }

  if (bestPos < 0) return text.substring(0, contextChars * 2);

  const start = Math.max(0, bestPos - contextChars);
  const end = Math.min(text.length, bestPos + contextChars);
  let snippet = text.substring(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

function highlightMatches(text: string, tokens: string[]): string {
  let result = text;
  for (const token of tokens) {
    const regex = new RegExp(`(${token})`, 'gi');
    result = result.replace(regex, '===$1===');
  }
  return result;
}

export function searchDocuments(query: string) {
  const db = getDatabase();
  if (!db) throw new Error('Banco não inicializado');

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return { results: [], total: 0 };

  const ftsQuery = queryTokens.join(' ');

  const stmt = db.prepare(`
    SELECT f.id, f.name, f.extension, f.size_formatted, f.category, f.parent_folder,
           dt.raw_text, ds.summary, ds.keywords, ds.topics, ds.word_count
    FROM files f
    INNER JOIN document_text dt ON dt.file_id = f.id AND dt.status = 'done'
    LEFT JOIN document_summary ds ON ds.file_id = f.id
    INNER JOIN document_text_fts ON document_text_fts.docid = dt.id
    WHERE document_text_fts MATCH ?
    LIMIT 100
  `);
  stmt.bind([ftsQuery]);

  const scored: any[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    const text = String(row.raw_text || '');

    let matchCount = 0;
    for (const token of queryTokens) {
      let idx = 0;
      const lower = text.toLowerCase();
      while ((idx = lower.indexOf(token, idx)) !== -1) {
        matchCount++;
        idx += token.length;
      }
    }

    const wordCount = Math.max(Number(row.word_count || 1), 1);
    const density = matchCount / wordCount;
    const summaryTokens = (String(row.keywords || '') + ' ' + String(row.summary || '')).toLowerCase();
    let summaryBonus = 0;
    for (const token of queryTokens) {
      if (summaryTokens.includes(token)) summaryBonus += 2;
    }

    const score = density * 100 + summaryBonus;

    scored.push({
      id: Number(row.id),
      name: String(row.name),
      extension: row.extension,
      size_formatted: String(row.size_formatted),
      category: String(row.category),
      parent_folder: String(row.parent_folder),
      summary: String(row.summary || ''),
      keywords: String(row.keywords || ''),
      word_count: wordCount,
      score: Math.round(score * 100) / 100,
      match_count: matchCount,
      snippet: extractSnippet(text, queryTokens),
      snippet_highlighted: highlightMatches(extractSnippet(text, queryTokens), queryTokens),
    });
  }
  stmt.free();

  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, SEARCH_LIMIT);

  return {
    results: topResults,
    total: topResults.length,
    query,
    tokens: queryTokens,
  };
}

export function getSuggestions() {
  const db = getDatabase();
  if (!db) return { suggestions: [] };

  const stmt = db.prepare(`SELECT keywords FROM document_summary WHERE keywords IS NOT NULL AND keywords != ''`);
  const wordScores = new Map<string, number>();

  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    const keywords = String(row.keywords).split(',').map(k => k.trim()).filter(Boolean);
    for (const kw of keywords) {
      wordScores.set(kw, (wordScores.get(kw) || 0) + 1);
    }
  }
  stmt.free();

  const suggestions = [...wordScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word]) => word);

  const categories = db.prepare('SELECT DISTINCT category FROM files ORDER BY category');
  const catSuggestions: string[] = [];
  while (categories.step()) {
    const row = categories.getAsObject() as any;
    const cat = String(row.category);
    if (cat !== 'Raiz') catSuggestions.push(cat);
  }
  categories.free();

  return {
    suggestions: [...suggestions.slice(0, 20), ...catSuggestions.slice(0, 10)],
  };
}
