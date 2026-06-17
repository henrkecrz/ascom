import { computeTfIdf, cosineSimilarity } from './nlpService';
import { insertRelation, getDatabase } from '../database';
import { getEmbeddingsBatch, saveEmbeddingsBatch } from '../db/embeddings';
import { logger } from '../lib/logger';

interface DocInput {
  id: number;
  text: string;
}

function getDocGroups(docIds: number[]): Map<string, number[]> {
  const db = getDatabase();
  const groups = new Map<string, number[]>();
  if (!db) return groups;

  for (let i = 0; i < docIds.length; i += 100) {
    const batch = docIds.slice(i, i + 100);
    const placeholders = batch.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT id, doc_type, category FROM files WHERE id IN (${placeholders})`);
    stmt.bind(batch);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      const type = String(row.doc_type || 'outro');
      const key = type !== 'outro' ? type : String(row.category);
      const id = Number(row.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(id);
    }
    stmt.free();
  }
  return groups;
}

function cosineSimilarityArray(vec1: number[], vec2: number[]): number {
  let dot = 0.0, norm1 = 0.0, norm2 = 0.0;
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  if (norm1 === 0 || norm2 === 0) return 0;
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export async function computeAllSimilarities(newDocs: DocInput[], allDocs: DocInput[]): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  logger.info('Calculando similaridades incrementalmente', { newDocs: newDocs.length, totalDocs: allDocs.length });

  const allDocIds = allDocs.map(d => d.id);
  const embeddingsMap = getEmbeddingsBatch(allDocIds);

  let useEmbeddings = false;
  
  const missingEmbeddings = newDocs.filter(d => !embeddingsMap.has(d.id));
  if (missingEmbeddings.length > 0) {
     try {
       for (let i = 0; i < missingEmbeddings.length; i += 20) {
         const batch = missingEmbeddings.slice(i, i + 20);
         const res = await fetch('http://localhost:8000/embeddings_batch', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ texts: batch.map(d => d.text) }),
           signal: AbortSignal.timeout(30000)
         });
         if (res.ok) {
           const json = await res.json() as any;
           if (json.embeddings) {
             const toSave = [];
             for(let j = 0; j < batch.length; j++) {
               embeddingsMap.set(batch[j].id, json.embeddings[j]);
               toSave.push({ fileId: batch[j].id, embedding: json.embeddings[j] });
             }
             saveEmbeddingsBatch(toSave);
           }
         }
       }
       useEmbeddings = true;
     } catch (err) {
       logger.warn('Python embeddings_batch falhou, fallback para TF-IDF', { error: (err as Error).message });
     }
  } else {
     useEmbeddings = embeddingsMap.size > 0;
  }

  const tfidfVectors = useEmbeddings ? new Map() : computeTfIdf(allDocs);

  const groups = getDocGroups(allDocIds);
  let comparisons = 0;
  const compared = new Set<string>();

  for (const newDoc of newDocs) {
    let newDocGroupId = null;
    for(const [g, ids] of groups) {
       if (ids.includes(newDoc.id)) { newDocGroupId = g; break; }
    }
    if (!newDocGroupId) continue;

    const groupIds = groups.get(newDocGroupId)!;
    for(const otherId of groupIds) {
       if (newDoc.id === otherId) continue;
       
       const pairKey = `${Math.min(newDoc.id, otherId)}_${Math.max(newDoc.id, otherId)}`;
       if (compared.has(pairKey)) continue;
       compared.add(pairKey);

       let score = 0;
       let sharedKeysStr = '';

       if (useEmbeddings) {
         const emb1 = embeddingsMap.get(newDoc.id);
         const emb2 = embeddingsMap.get(otherId);
         if (emb1 && emb2) {
           score = cosineSimilarityArray(emb1, emb2);
           if (score > 0.5) sharedKeysStr = 'Semântica AI';
           else score = 0;
         }
       } else {
         const vec1 = tfidfVectors.get(newDoc.id);
         const vec2 = tfidfVectors.get(otherId);
         if (vec1 && vec2) {
           score = cosineSimilarity(vec1, vec2);
           if (score > 0.01) {
             sharedKeysStr = findSharedKeywords(vec1, vec2, 0.1).join(', ');
           }
         }
       }

       if (score > 0.01) {
         insertRelation(newDoc.id, otherId, score, sharedKeysStr);
         comparisons++;
       }
    }
  }

  logger.info('Relações incrementais encontradas', { count: comparisons });

  try {
     db.run('BEGIN TRANSACTION');
     for(const nd of newDocs) {
       db.run('UPDATE files SET relations_computed = 1 WHERE id = ?', [nd.id]);
     }
     db.run('COMMIT');
  } catch(e) {
     db.run('ROLLBACK');
  }
}

function findSharedKeywords(
  vec1: Map<string, number>,
  vec2: Map<string, number>,
  threshold: number = 0.1
): string[] {
  const shared: string[] = [];
  for (const [key, val1] of vec1) {
    const val2 = vec2.get(key);
    if (val2 !== undefined && (val1 > threshold || val2 > threshold)) {
      shared.push(key);
    }
  }
  return shared.slice(0, 15);
}
