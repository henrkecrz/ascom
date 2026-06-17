const natural = require('natural');
import { STOPWORDS_PT } from '../shared/stopwords';

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

const tfidfCache = new Map<string, Map<number, Map<string, number>>>();

export function clearTfIdfCache(): void {
  tfidfCache.clear();
}

function cleanToken(token: string): string {
  return token.toLowerCase()
    .replace(/[^a-záéíóúâêîôûãõàçA-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ0-9]/g, '')
    .trim();
}

function isStopword(token: string): boolean {
  return token.length < 2 || STOPWORDS_PT.has(token);
}

export function segmentText(text: string): string[] {
  const sentences = text.split(/[.!?;:\n]+/).filter(s => s.trim().length > 10);
  return sentences;
}

export function extractKeywords(text: string, topN: number = 20): string[] {
  const tokens = tokenizer.tokenize(text) || [];
  const cleaned = tokens.map(cleanToken).filter((t: string) => t && !isStopword(t));

  const freqs: Record<string, number> = {};
  for (const token of cleaned) {
    freqs[token] = (freqs[token] || 0) + 1;
  }

  return Object.entries(freqs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

export function generateSummary(text: string, maxSentences: number = 5): string {
  const sentences = segmentText(text);
  if (sentences.length <= maxSentences) return sentences.join('. ');

  const tokens = tokenizer.tokenize(text) || [];
  const cleaned = tokens.map(cleanToken).filter((t: string) => t && !isStopword(t));
  const freqs: Record<string, number> = {};
  for (const token of cleaned) {
    freqs[token] = (freqs[token] || 0) + 1;
  }

  const scored = sentences.map((sent: string, i: number) => {
    const sentTokens = tokenizer.tokenize(sent) || [];
    const score = sentTokens
      .map(cleanToken)
      .filter((t: string) => t && !isStopword(t))
      .reduce((sum: number, t: string) => sum + (freqs[t] || 0), 0);
    return { index: i, score: score / Math.max(sentTokens.length, 1), text: sent };
  });

  scored.sort((a, b) => b.score - a.score);
  const topSentences = scored.slice(0, maxSentences);
  topSentences.sort((a, b) => a.index - b.index);

  return topSentences.map(s => s.text.trim()).join('. ') + '.';
}

export function computeTfIdf(documents: { id: number; text: string }[]): Map<number, Map<string, number>> {
  const cacheKey = documents.map(d => `${d.id}`).join(',');
  const cached = tfidfCache.get(cacheKey);
  if (cached) return cached;

  const tfidf = new TfIdf();

  for (const doc of documents) {
    const tokens = tokenizer.tokenize(doc.text.toLowerCase()) || [];
    const cleaned = tokens.map(cleanToken).filter((t: string) => t && !isStopword(t));
    tfidf.addDocument(cleaned);
  }

  const result = new Map<number, Map<string, number>>();

  for (let i = 0; i < documents.length; i++) {
    const wordScores = new Map<string, number>();
    const terms: any[] = [];
    tfidf.listTerms(i).forEach((item: any) => {
      terms.push(item);
    });
    const topTerms = terms.slice(0, 50);
    for (const term of topTerms) {
      wordScores.set(term.term, term.tfidf);
    }
    result.set(documents[i].id, wordScores);
  }

  tfidfCache.set(cacheKey, result);
  return result;
}

export function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  const allKeys = new Set([...vec1.keys(), ...vec2.keys()]);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const key of allKeys) {
    const v1 = vec1.get(key) || 0;
    const v2 = vec2.get(key) || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export function extractTopics(text: string, numTopics: number = 3): string[] {
  const keywords = extractKeywords(text, 30);
  const segments = segmentText(text);
  if (segments.length === 0) return keywords.slice(0, numTopics);

  const topicClusters: { words: string[]; score: number }[] = [];

  for (let i = 0; i < Math.min(segments.length, 20); i++) {
    const segTokens = tokenizer.tokenize(segments[i]) || [];
    const cleaned = segTokens.map(cleanToken).filter((t: string) => t && !isStopword(t));
    const uniqueWords = [...new Set(cleaned)] as string[];
    const overlapScore = uniqueWords.filter((w: string) => keywords.includes(w)).length;

    topicClusters.push({
      words: uniqueWords.slice(0, 5),
      score: overlapScore,
    });
  }

  topicClusters.sort((a, b) => b.score - a.score);
  const topTopics = topicClusters.slice(0, numTopics);

  return topTopics.map(t => t.words.slice(0, 3).join(' '));
}
