import { getDatabase } from '../database';

export function scalarNumber(sql: string, params: any[] = []): number {
  const db = getDatabase();
  if (!db) return 0;
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const value = stmt.step() ? Number(Object.values(stmt.getAsObject() as any)[0] || 0) : 0;
    stmt.free();
    return value;
  } catch {
    return 0;
  }
}

export function queryRows<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDatabase();
  if (!db) return [];
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    stmt.free();
    return rows;
  } catch {
    return [];
  }
}

export function safeJson(value: any, fallback: any = null): any {
  if (!value) return fallback;
  try { return JSON.parse(String(value)); } catch { return fallback; }
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
