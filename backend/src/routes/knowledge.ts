import { Router, Request, Response } from 'express';
import { queryKnowledgeRelations, getDatabase } from '../database';

const router = Router();

router.get('/api/knowledge-graph', (req: Request, res: Response) => {
  const source_type = req.query.source_type as string | undefined;
  const source_id = req.query.source_id ? Number(req.query.source_id) : undefined;
  const target_type = req.query.target_type as string | undefined;
  const target_id = req.query.target_id ? Number(req.query.target_id) : undefined;
  const relation_type = req.query.relation_type as string | undefined;

  const relations = queryKnowledgeRelations({ source_type, source_id, target_type, target_id, relation_type });
  res.json({ relations });
});

router.get('/api/knowledge-graph/network', (_req: Request, res: Response) => {
  const db = getDatabase();
  if (!db) return res.json({ nodes: [], edges: [] });

  const nodes: any[] = [];
  const edges: any[] = [];
  const added = new Set<string>();

  const addNode = (id: string, label: string, type: string) => {
    if (!added.has(id)) { added.add(id); nodes.push({ id, label, type }); }
  };

  const rels = queryKnowledgeRelations({});
  for (const rel of rels) {
    const sId = `${rel.source_type}_${rel.source_id}`;
    const tId = `${rel.target_type}_${rel.target_id}`;
    addNode(sId, `${rel.source_type}#${rel.source_id}`, rel.source_type);
    addNode(tId, `${rel.target_type}#${rel.target_id}`, rel.target_type);
    edges.push({ from: sId, to: tId, label: rel.relation_type, value: rel.confidence });
  }

  res.json({ nodes, edges });
});

export default router;
