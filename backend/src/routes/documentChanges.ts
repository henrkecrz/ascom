import { Router, Request, Response } from 'express';
import {
  createDocumentVersion,
  createChangeEventFromVersions,
  getLatestDocumentVersion,
  getDocumentVersion,
  getVersionDiff,
  listDocumentVersions,
  listDocumentChanges,
  listDocumentChangesByFile,
  getDocumentChange,
  updateDocumentChangeStatus,
  listDocumentChangeAlerts,
  resolveDocumentChangeAlert,
} from '../database';

const router = Router();

function intParam(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.get('/api/document-changes', (req: Request, res: Response) => {
  const changes = listDocumentChanges({
    impact: req.query.impact ? String(req.query.impact) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json({ changes });
});

router.get('/api/document-changes/alerts', (req: Request, res: Response) => {
  const resolved = req.query.resolved === undefined ? undefined : String(req.query.resolved) === 'true' || String(req.query.resolved) === '1';
  res.json({ alerts: listDocumentChangeAlerts(resolved) });
});

router.post('/api/document-changes/alerts/:id/resolve', (req: Request, res: Response) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  resolveDocumentChangeAlert(id);
  res.json({ success: true });
});

router.get('/api/document-changes/by-file/:fileId', (req: Request, res: Response) => {
  const fileId = intParam(req.params.fileId);
  if (!fileId) return res.status(400).json({ error: 'ID inválido' });
  res.json({ changes: listDocumentChangesByFile(fileId) });
});

router.get('/api/document-changes/:id', (req: Request, res: Response) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  const change = getDocumentChange(id);
  if (!change) return res.status(404).json({ error: 'Mudança não encontrada' });
  res.json(change);
});

router.post('/api/document-changes/:id/review', (req: Request, res: Response) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  updateDocumentChangeStatus(id, req.body?.status || 'reviewed', req.body?.reviewedBy || 'user');
  res.json({ success: true });
});

router.post('/api/document-changes/:id/resolve', (req: Request, res: Response) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  updateDocumentChangeStatus(id, 'resolved', req.body?.reviewedBy || 'user');
  res.json({ success: true });
});

router.get('/api/documents/:id/versions', (req: Request, res: Response) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  res.json({ versions: listDocumentVersions(id) });
});

router.get('/api/documents/:id/versions/:versionId', (req: Request, res: Response) => {
  const versionId = intParam(req.params.versionId);
  if (!versionId) return res.status(400).json({ error: 'ID inválido' });
  const version = getDocumentVersion(versionId);
  if (!version) return res.status(404).json({ error: 'Versão não encontrada' });
  res.json(version);
});

router.get('/api/documents/:id/diff/:oldVersionId/:newVersionId', (req: Request, res: Response) => {
  const oldVersionId = intParam(req.params.oldVersionId);
  const newVersionId = intParam(req.params.newVersionId);
  if (!oldVersionId || !newVersionId) return res.status(400).json({ error: 'IDs inválidos' });
  const diff = getVersionDiff(oldVersionId, newVersionId);
  if (!diff) return res.status(404).json({ error: 'Versões não encontradas' });
  res.json(diff);
});

router.post('/api/documents/:id/reprocess', (req: Request, res: Response) => {
  const id = intParam(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  const oldVersion = getLatestDocumentVersion(id);
  const newVersion = createDocumentVersion(id);
  const change = newVersion ? createChangeEventFromVersions(id, oldVersion, newVersion) : null;
  res.json({ success: true, version: newVersion, change });
});

export default router;
