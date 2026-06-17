import {
  getDatabase, insertKnowledgeRelation, clearKnowledgeRelations,
  queryKnowledgeRelations, getAllDocuments, getAllContacts, getDocumentSections
} from '../database';

export function buildKnowledgeGraph(): { nodes: number; edges: number } {
  const db = getDatabase();
  if (!db) return { nodes: 0, edges: 0 };
  let edgeCount = 0;
  
  // Get only uncomputed docs for the graph
  const docs = getAllDocuments().filter((d: any) => !d.graph_computed);
  if (docs.length === 0) return { nodes: 0, edges: 0 };

  const contacts = getAllContacts();
  const docMap = new Map(docs.map(d => [d.id, d]));
  
  try {
    db.run('BEGIN TRANSACTION');
    for (const doc of docs) {
      const sections = getDocumentSections(doc.id);
    for (const sec of sections) {
      insertKnowledgeRelation({
        source_type: 'file',
        source_id: doc.id,
        target_type: 'document_section',
        target_id: sec.id,
        relation_type: 'contem_secao',
        confidence: 1.0,
        metadata: { section_title: sec.section_title },
      });
      edgeCount++;
    }
    const docTypeStr = (doc as any).doc_type || '';
    if (docTypeStr === 'porta_voz' || docTypeStr === 'relacionamento') {
      for (const contact of contacts) {
        const docNameLower = doc.name.toLowerCase();
        const contactNameLower = contact.name.toLowerCase();
        if (docNameLower.includes(contactNameLower.split(' ')[0])) {
          insertKnowledgeRelation({
            source_type: 'file',
            source_id: doc.id,
            target_type: 'contact',
            target_id: contact.id,
            relation_type: 'menciona',
            confidence: 0.7,
          });
          edgeCount++;
        }
      }
    }
    }
    
    const sdStmt = db.prepare('SELECT DISTINCT source_file_id, schema_type, theme FROM structured_data');
    while (sdStmt.step()) {
      const row = sdStmt.getAsObject() as any;
      const fileId = Number(row.source_file_id);
      if (docMap.has(fileId)) {
        insertKnowledgeRelation({
          source_type: 'file',
          source_id: fileId,
          target_type: 'structured_data_sheet',
          target_id: 0,
          relation_type: 'contem_dados',
          confidence: 0.9,
          metadata: { schema_type: String(row.schema_type), theme: String(row.theme || '') },
        });
        edgeCount++;
      }
    }
    sdStmt.free();
    
    const clusterStmt = db.prepare('SELECT id, file_ids FROM document_clusters');
    while (clusterStmt.step()) {
      const row = clusterStmt.getAsObject() as any;
      const fileIds = (String(row.file_ids || '')).split(',').map(Number).filter(Boolean);
      for (let i = 0; i < fileIds.length; i++) {
        for (let j = i + 1; j < fileIds.length; j++) {
          insertKnowledgeRelation({
            source_type: 'file',
            source_id: fileIds[i],
            target_type: 'file',
            target_id: fileIds[j],
            relation_type: 'mesmo_cluster',
            confidence: 0.6,
            metadata: { cluster_id: Number(row.id) },
          });
          edgeCount++;
        }
      }
    }
    clusterStmt.free();

    for (const doc of docs) {
      db.run('UPDATE files SET graph_computed = 1 WHERE id = ?', [doc.id]);
    }

    db.run('COMMIT');
  } catch (err: any) {
    db.run('ROLLBACK');
    console.error('Error building knowledge graph incrementally:', err);
  }

  return { nodes: docs.length + contacts.length, edges: edgeCount };
}

export function getKnowledgeNetwork(): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  const addedNodes = new Set<string>();
  const addNode = (id: string, label: string, type: string, group?: string) => {
    if (!addedNodes.has(id)) {
      addedNodes.add(id);
      nodes.push({ id, label, type, group: group || type });
    }
  };
  const relations = queryKnowledgeRelations({});
  for (const rel of relations) {
    const sId = `${rel.source_type}_${rel.source_id}`;
    const tId = `${rel.target_type}_${rel.target_id}`;
    addNode(sId, `${rel.source_type}#${rel.source_id}`, rel.source_type);
    addNode(tId, `${rel.target_type}#${rel.target_id}`, rel.target_type);
    edges.push({
      from: sId,
      to: tId,
      label: rel.relation_type,
      value: rel.confidence,
      title: rel.metadata ? JSON.stringify(rel.metadata) : '',
    });
  }
  return { nodes, edges };
}

export function getRelatedByEntity(entityName: string): any[] {
  const db = getDatabase();
  if (!db) return [];
  const results: any[] = [];
  const fileStmt = db.prepare(`
    SELECT f.id, f.name, f.doc_type, f.entities
    FROM files f
    WHERE f.entities LIKE ?
  `);
  fileStmt.bind([`%${entityName}%`]);
  while (fileStmt.step()) {
    const row = fileStmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      name: String(row.name),
      docType: String(row.doc_type || ''),
    });
  }
  fileStmt.free();
  const sectionStmt = db.prepare(`
    SELECT ds.id, ds.section_title, ds.file_id, ds.extracted_entities
    FROM document_sections ds
    WHERE ds.extracted_entities LIKE ?
  `);
  sectionStmt.bind([`%${entityName}%`]);
  while (sectionStmt.step()) {
    const row = sectionStmt.getAsObject() as any;
    results.push({
      id: Number(row.id),
      name: `Seção: ${row.section_title || 'sem nome'}`,
      docType: 'document_section',
      fileId: Number(row.file_id),
    });
  }
  sectionStmt.free();
  return results;
}
