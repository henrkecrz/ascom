import { getDatabase, scheduleSave } from './connection';

export function saveEmbedding(fileId: number, embedding: number[]): void {
  const db = getDatabase();
  if (!db) return;
  try {
    db.run(
      'INSERT OR REPLACE INTO document_embeddings (file_id, embedding_json) VALUES (?, ?)',
      [fileId, JSON.stringify(embedding)]
    );
    scheduleSave();
  } catch (err: any) {
    console.error(`Error saving embedding for file ${fileId}: ${err.message}`);
  }
}

export function saveEmbeddingsBatch(items: { fileId: number, embedding: number[] }[]): void {
  const db = getDatabase();
  if (!db) return;
  try {
    db.run('BEGIN TRANSACTION');
    for (const item of items) {
      db.run(
        'INSERT OR REPLACE INTO document_embeddings (file_id, embedding_json) VALUES (?, ?)',
        [item.fileId, JSON.stringify(item.embedding)]
      );
    }
    db.run('COMMIT');
    scheduleSave();
  } catch (err: any) {
    db.run('ROLLBACK');
    console.error(`Error saving embeddings batch: ${err.message}`);
  }
}

export function getEmbedding(fileId: number): number[] | null {
  const db = getDatabase();
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT embedding_json FROM document_embeddings WHERE file_id = ?');
    stmt.bind([fileId]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return JSON.parse(row.embedding_json);
    }
    stmt.free();
  } catch (err: any) {
    console.error(`Error getting embedding for file ${fileId}: ${err.message}`);
  }
  return null;
}

export function getEmbeddingsBatch(fileIds: number[]): Map<number, number[]> {
  const db = getDatabase();
  const map = new Map<number, number[]>();
  if (!db || fileIds.length === 0) return map;

  try {
    for (let i = 0; i < fileIds.length; i += 100) {
      const batch = fileIds.slice(i, i + 100);
      const placeholders = batch.map(() => '?').join(',');
      const stmt = db.prepare(`SELECT file_id, embedding_json FROM document_embeddings WHERE file_id IN (${placeholders})`);
      stmt.bind(batch);
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        map.set(Number(row.file_id), JSON.parse(row.embedding_json));
      }
      stmt.free();
    }
  } catch (err: any) {
    console.error(`Error getting embeddings batch: ${err.message}`);
  }
  return map;
}
