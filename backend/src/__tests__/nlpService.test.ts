import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractKeywords, generateSummary, cosineSimilarity, extractTopics, segmentText } from '../analysis/nlpService';

void describe('nlpService', () => {
  void it('segmentText divides by punctuation', () => {
    const result = segmentText('Primeira frase longa aqui. Segunda frase longa ali? Terceira frase longa acolá!');
    assert.ok(result.length >= 3);
  });

  void it('extractKeywords returns top words', () => {
    const text = 'comunicacao crise comunicacao ascom novacap comunicacao crise';
    const keywords = extractKeywords(text, 3);
    assert.ok(keywords.includes('comunicacao'));
    assert.ok(keywords.includes('crise'));
    assert.ok(keywords.length <= 3);
  });

  void it('extractKeywords returns empty for empty text', () => {
    const result = extractKeywords('', 5);
    assert.deepStrictEqual(result, []);
  });

  void it('generateSummary returns full text when short', () => {
    const text = 'Frase curta';
    const summary = generateSummary(text, 5);
    assert.ok(summary.length > 0);
  });

  void it('generateSummary handles long text', () => {
    const sentences = Array.from({ length: 20 }, (_, i) => `Frase numero ${i + 1} sobre comunicacao e crise.`);
    const text = sentences.join(' ');
    const summary = generateSummary(text, 3);
    const summarySentences = summary.split('.').filter(s => s.trim());
    assert.ok(summarySentences.length <= 3);
  });

  void it('cosineSimilarity identical vectors', () => {
    const vec = new Map([['crise', 2], ['comunicacao', 1]]);
    const sim = cosineSimilarity(vec, vec);
    assert.ok(Math.abs(sim - 1) < 0.0001);
  });

  void it('cosineSimilarity orthogonal vectors', () => {
    const vec1 = new Map([['crise', 1]]);
    const vec2 = new Map([['comunicacao', 1]]);
    const sim = cosineSimilarity(vec1, vec2);
    assert.strictEqual(sim, 0);
  });

  void it('cosineSimilarity partial overlap', () => {
    const vec1 = new Map([['crise', 1], ['comunicacao', 1]]);
    const vec2 = new Map([['crise', 1], ['ascom', 1]]);
    const sim = cosineSimilarity(vec1, vec2);
    assert.ok(sim > 0 && sim < 1);
  });

  void it('cosineSimilarity zero norm', () => {
    const sim = cosineSimilarity(new Map(), new Map([['crise', 1]]));
    assert.strictEqual(sim, 0);
  });

  void it('extractTopics returns topics', () => {
    const text = 'A comunicacao de crise na Novacap e fundamental. O plano de comunicacao deve ser seguido. A ascom gerencia as crises.';
    const topics = extractTopics(text, 2);
    assert.ok(topics.length <= 2);
    assert.ok(topics.every(t => typeof t === 'string' && t.length > 0));
  });

  void it('extractTopics empty text', () => {
    const topics = extractTopics('', 3);
    assert.deepStrictEqual(topics, []);
  });
});
