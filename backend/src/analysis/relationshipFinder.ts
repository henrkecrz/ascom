import { getDatabase } from '../database';
import { getDynamicTables } from './dynamicTableGenerator';
import { logger } from '../lib/logger';

export interface Relationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  type: 'foreign_key' | 'name_match' | 'value_overlap' | 'semantic_match';
  confidence: number;
  description: string;
}

/**
 * Find potential relationships between all dynamic tables
 * Uses 3 strategies:
 * 1. Column name matching (e.g., "contato_id" → "contacts.id")
 * 2. Common column names between tables
 * 3. Value overlap sampling
 */
export function findAllRelationships(): Relationship[] {
  const relationships: Relationship[] = [];
  const tables = getDynamicTables();

  // Also include known system tables that are common targets
  const knownTables = [
    { tableName: 'files', columns: ['id', 'name', 'category', 'doc_type'] },
    { tableName: 'contacts', columns: ['id', 'name', 'organization', 'email'] },
    ...tables,
  ];

  for (const source of knownTables) {
    for (const target of knownTables) {
      if (source.tableName === target.tableName) continue;

      // Strategy 1: Column name matching (FK pattern)
      for (const srcCol of source.columns) {
        // Check if column looks like a FK reference: e.g., "contact_id" → "contacts.id"
        for (const tgtCol of target.columns) {
          const srcLower = srcCol.toLowerCase();
          const tgtLower = tgtCol.toLowerCase();

          // Pattern: source column contains target table name + _id
          // e.g., "contact_id" in table X → "id" in "contacts"
          if (tgtLower === 'id') {
            const singularTable = target.tableName.replace(/s$/, '').toLowerCase();
            if (srcLower === `${singularTable}_id` || srcLower === `${target.tableName}_id`) {
              relationships.push({
                sourceTable: source.tableName,
                sourceColumn: srcCol,
                targetTable: target.tableName,
                targetColumn: tgtCol,
                type: 'foreign_key',
                confidence: 0.9,
                description: `${srcCol} referencia ${target.tableName}.${tgtCol}`,
              });
            }
          }

          // Strategy 2: Same column name in both tables
          if (srcLower === tgtLower && srcLower !== 'id' && srcLower !== 'name') {
            relationships.push({
              sourceTable: source.tableName,
              sourceColumn: srcCol,
              targetTable: target.tableName,
              targetColumn: tgtCol,
              type: 'name_match',
              confidence: 0.6,
              description: `Coluna compartilhada: ${srcCol}`,
            });
          }

          // Strategy 3: Semantic Match (CPF, CNPJ, Email, Phone)
          const semanticKeywords = ['cpf', 'cnpj', 'email', 'telefone', 'cep', 'url'];
          for (const keyword of semanticKeywords) {
            if (srcLower.includes(keyword) && tgtLower.includes(keyword)) {
              relationships.push({
                sourceTable: source.tableName,
                sourceColumn: srcCol,
                targetTable: target.tableName,
                targetColumn: tgtCol,
                type: 'semantic_match',
                confidence: 0.8,
                description: `Relacionamento semântico (${keyword.toUpperCase()})`,
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return relationships.filter(r => {
    const key = `${r.sourceTable}.${r.sourceColumn}→${r.targetTable}.${r.targetColumn}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Sample-based relationship validation.
 * For a given relationship, check if values from source column
 * actually appear in target column (value overlap).
 */
export function validateRelationship(rel: Relationship, sampleSize: number = 50): { valid: boolean; overlapRatio: number } {
  const db = getDatabase();
  if (!db) return { valid: false, overlapRatio: 0 };

  try {
    // Get sample values from source
    const srcStmt = db.prepare(`SELECT DISTINCT "${rel.sourceColumn}" FROM "${rel.sourceTable}" WHERE "${rel.sourceColumn}" IS NOT NULL LIMIT ?`);
    srcStmt.bind([sampleSize]);
    const srcValues: any[] = [];
    while (srcStmt.step()) {
      const row = srcStmt.getAsObject() as any;
      srcValues.push(row[rel.sourceColumn]);
    }
    srcStmt.free();

    if (srcValues.length === 0) return { valid: false, overlapRatio: 0 };

    // Check how many exist in target
    let matches = 0;
    for (const val of srcValues) {
      const tgtStmt = db.prepare(`SELECT COUNT(*) as c FROM "${rel.targetTable}" WHERE "${rel.targetColumn}" = ?`);
      tgtStmt.bind([val]);
      if (tgtStmt.step()) {
        const row = tgtStmt.getAsObject() as any;
        if (Number(row.c) > 0) matches++;
      }
      tgtStmt.free();
    }

    const overlapRatio = matches / srcValues.length;
    return { valid: overlapRatio > 0.3, overlapRatio };
  } catch (err: any) {
    logger.warn('Failed to validate relationship', { error: err.message });
    return { valid: false, overlapRatio: 0 };
  }
}

/**
 * Get validated relationships (only those confirmed by value overlap)
 */
export function getValidatedRelationships(): Relationship[] {
  const all = findAllRelationships();
  return all.filter(r => {
    const result = validateRelationship(r);
    return result.valid;
  });
}

/**
 * Generate CREATE TABLE foreign key suggestions as SQL
 */
export function generateForeignKeySql(relationships: Relationship[]): string[] {
  return relationships
    .filter(r => r.type === 'foreign_key' && r.confidence >= 0.7)
    .map(r =>
      `-- ${r.description}\n-- ALTER TABLE "${r.sourceTable}" ADD FOREIGN KEY ("${r.sourceColumn}") REFERENCES "${r.targetTable}"("${r.targetColumn}");`
    );
}
