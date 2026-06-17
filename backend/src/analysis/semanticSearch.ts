import { computeTfIdf, cosineSimilarity } from './nlpService';
import { getDatabase } from '../database';

function persistVectors(vectors: Map<number, Map<string, number>>): void {
  const db = getDatabase();
  if (!db) return;
  const stmt = db.prepare('INSERT OR REPLACE INTO document_vectors (file_id, term, tfidf_score) VALUES (?, ?, ?)');
  for (const [fileId, terms] of vectors) {
    if (fileId === -1) continue;
    for (const [term, score] of terms) {
      stmt.bind([fileId, term, score]);
      stmt.step();
      stmt.reset();
    }
  }
}

export function rankDocumentsByQuery(
  query: string,
  documents: { id: number; text: string }[]
): { id: number; score: number }[] {
  if (!query.trim() || documents.length === 0) return [];

  const allItems = [...documents, { id: -1, text: query }];
  const vectors = computeTfIdf(allItems);
  const queryVec = vectors.get(-1);
  if (!queryVec) return [];

  persistVectors(vectors);

  const results: { id: number; score: number }[] = [];
  for (const [id, vec] of vectors) {
    if (id === -1) continue;
    const score = cosineSimilarity(queryVec, vec);
    if (score > 0) results.push({ id, score: Math.round(score * 10000) / 10000 });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
