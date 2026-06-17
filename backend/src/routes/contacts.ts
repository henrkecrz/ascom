import { Router, Request, Response } from 'express';
import { getAllContacts, insertContact, deleteContact } from '../database';

const router = Router();

router.get('/api/contacts', (_req: Request, res: Response) => {
  const contacts = getAllContacts();
  res.json({ count: contacts.length, contacts });
});

router.post('/api/contacts', (req: Request, res: Response) => {
  const { name, role, organization, phone, email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do contato é obrigatório' });

  const id = insertContact({
    name,
    role: role || '',
    organization: organization || '',
    phone: phone || '',
    email: email || '',
    notes: notes || '',
  });

  res.json({ success: true, id });
});

router.delete('/api/contacts/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  deleteContact(id);
  res.json({ success: true });
});

export default router;
