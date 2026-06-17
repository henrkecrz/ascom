import { getDatabase, scheduleSave } from '../database';
import crypto from 'crypto';
import { InferredSchema } from './schemaInferrer';

export function generateSchemaHash(headers: string[], extension: string): string {
  const normalized = headers.map(h => h.trim().toLowerCase()).sort().join('|');
  return crypto.createHash('md5').update(`${extension}:${normalized}`).digest('hex');
}

export function getCachedSchema(hash: string): InferredSchema | null {
  const db = getDatabase();
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT schema_json FROM schema_cache WHERE hash = ?');
    stmt.bind([hash]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return JSON.parse(row.schema_json);
    }
    stmt.free();
  } catch (e) {
    // Ignore error if table doesn't exist yet
  }
  return null;
}

export function cacheSchema(hash: string, schema: InferredSchema): void {
  const db = getDatabase();
  if (!db) return;
  try {
    db.run('INSERT OR REPLACE INTO schema_cache (hash, schema_json) VALUES (?, ?)', [hash, JSON.stringify(schema)]);
    scheduleSave();
  } catch (e) {
    // Ignore
  }
}
