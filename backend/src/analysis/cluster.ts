import { getDatabase, insertCluster } from '../database';

const MIN_KEYWORD_OVERLAP = 2;
const MAX_CLUSTER_KEYWORDS = 10;
const MAX_CLUSTER_DESC_KEYWORDS = 5;

function getClusterDocIds(db: any): { id: number; ids: number[] }[] {
  const stmt = db.prepare('SELECT id, file_ids FROM document_clusters');
  const result: { id: number; ids: number[] }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    result.push({ id: Number(row.id), ids: String(row.file_ids).split(',').map(Number) });
  }
  stmt.free();
  return result;
}

function getKeywordsBatch(db: any, fileIds: number[]): Map<number, string[]> {
  const kwMap = new Map<number, string[]>();
  if (fileIds.length === 0) return kwMap;

  for (let i = 0; i < fileIds.length; i += 100) {
    const batch = fileIds.slice(i, i + 100);
    const placeholders = batch.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT file_id, keywords FROM document_summary WHERE file_id IN (${placeholders})`);
    stmt.bind(batch);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      const keywords = String(row.keywords || '').split(',').map(k => k.trim()).filter(Boolean);
      kwMap.set(Number(row.file_id), keywords);
    }
    stmt.free();
  }
  return kwMap;
}

function computeTfIdfClusters(db: any, allDocs: { id: number; keywords: string[] }[]): Map<string, number[]> {
  const docCount = allDocs.length;
  const df = new Map<string, number>();
  const docVectors: { id: number; terms: Map<string, number> }[] = [];

  for (const doc of allDocs) {
    const terms = new Map<string, number>();
    const seen = new Set<string>();
    for (const kw of doc.keywords) {
      terms.set(kw, (terms.get(kw) || 0) + 1);
      if (!seen.has(kw)) {
        df.set(kw, (df.get(kw) || 0) + 1);
        seen.add(kw);
      }
    }
    docVectors.push({ id: doc.id, terms });
  }

  const clusters = new Map<string, number[]>();
  const assigned = new Set<number>();

  for (let i = 0; i < docVectors.length; i++) {
    if (assigned.has(docVectors[i].id)) continue;

    const cluster = [docVectors[i].id];
    assigned.add(docVectors[i].id);

    for (let j = i + 1; j < docVectors.length; j++) {
      if (assigned.has(docVectors[j].id)) continue;

      let overlap = 0;
      for (const term of docVectors[j].terms.keys()) {
        if (docVectors[i].terms.has(term)) overlap++;
      }

      if (overlap >= MIN_KEYWORD_OVERLAP) {
        cluster.push(docVectors[j].id);
        assigned.add(docVectors[j].id);
      }
    }

    if (cluster.length > 1) {
      const topTerms = [...docVectors[i].terms.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t);
      const clusterName = topTerms.join('_').substring(0, 50) || `cluster_${clusters.size}`;
      if (!clusters.has(clusterName)) {
        clusters.set(clusterName, cluster);
      }
    }
  }

  return clusters;
}

export function generateClusters(): void {
  const db = getDatabase();
  if (!db) return;

  db.run('DELETE FROM document_clusters');

  // Always create folder-based clusters
  const fileStmt = db.prepare('SELECT id, category FROM files');
  const categories: Map<string, number[]> = new Map();
  while (fileStmt.step()) {
    const row = fileStmt.getAsObject() as any;
    const cat = String(row.category);
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(Number(row.id));
  }
  fileStmt.free();

  for (const [catName, fileIds] of categories) {
    const name = catName.split(' > ').pop() || catName;
    insertCluster(name.trim(), `Documentos da categoria: ${catName}`, fileIds.join(','), catName);
  }

  // Enrich with content-based clustering
  const allDocIds: number[] = [];
  for (const ids of categories.values()) allDocIds.push(...ids);
  const kwMap = getKeywordsBatch(db, allDocIds);
  const allDocs = [...kwMap.entries()].map(([id, keywords]) => ({ id, keywords }));
  const contentClusters = computeTfIdfClusters(db, allDocs);

  for (const [name, fileIds] of contentClusters) {
    insertCluster(name, `Cluster por similaridade de conteúdo (${fileIds.length} documentos)`, fileIds.join(','), 'conteudo');
  }

  // Update themes and descriptions with batched keywords
  const clusterRows = getClusterDocIds(db);
  const allClusterIds: number[] = [];
  clusterRows.forEach(r => allClusterIds.push(...r.ids));
  const allKws = getKeywordsBatch(db, allClusterIds);

  for (const { id, ids } of clusterRows) {
    if (ids.length < 2) continue;

    const keywordCounts = new Map<string, number>();
    for (const docId of ids) {
      const keywords = allKws.get(docId) || [];
      for (const kw of keywords) {
        keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
      }
    }

    const sorted = [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CLUSTER_KEYWORDS)
      .map(([w]) => w);

    db.run('UPDATE document_clusters SET theme_words = ? WHERE id = ?',
      [sorted.join(', '), id]);

    const desc = `Grupo de ${ids.length} documentos relacionados a ${sorted.slice(0, MAX_CLUSTER_DESC_KEYWORDS).join(', ')}`;
    db.run('UPDATE document_clusters SET description = ? WHERE id = ?', [desc, id]);
  }
}
