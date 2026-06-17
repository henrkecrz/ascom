import { Router, Request, Response } from 'express';
import { getSetting, setSetting } from '../database';
import { getFreeModels } from '../services/modelCache';
import { encrypt, decrypt } from '../lib/crypto';

const router = Router();

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

router.get('/api/settings', (_req: Request, res: Response) => {
  const encryptedKey = getSetting('ai_api_key') || '';
  const decryptedKey = encryptedKey ? decrypt(encryptedKey) : '';

  res.json({
    ai_provider: getSetting('ai_provider') || 'opencode',
    ai_api_key: decryptedKey || '',
    ai_api_key_masked: maskApiKey(decryptedKey),
    ai_base_url: getSetting('ai_base_url') || 'https://opencode.ai/zen/v1',
    ai_model: getSetting('ai_model') || 'opencode/deepseek-v4-flash-free',
    ai_potency: getSetting('ai_potency') || '0.7',
    store_original_files: getSetting('store_original_files') || 'true',
  });
});

router.post('/api/settings', (req: Request, res: Response) => {
  const { ai_provider, ai_api_key, ai_base_url, ai_model, ai_potency, store_original_files } = req.body;

  if (ai_provider !== undefined) setSetting('ai_provider', String(ai_provider));
  if (ai_api_key !== undefined) {
    const encrypted = encrypt(String(ai_api_key));
    setSetting('ai_api_key', encrypted);
  }
  if (ai_base_url !== undefined) setSetting('ai_base_url', String(ai_base_url));
  if (ai_model !== undefined) setSetting('ai_model', String(ai_model));
  if (ai_potency !== undefined) setSetting('ai_potency', String(ai_potency));
  if (store_original_files !== undefined) setSetting('store_original_files', store_original_files ? 'true' : 'false');

  res.json({ success: true });
});

router.get('/api/settings/models', async (_req: Request, res: Response) => {
  const models = getFreeModels();
  res.json({
    models,
    all: models,
    filtered: true,
  });
});

router.post('/api/settings/test-model', async (req: Request, res: Response) => {
  const { api_key, base_url, model } = req.body;
  const encryptedKey = getSetting('ai_api_key');
  const storedKey = encryptedKey ? decrypt(encryptedKey) : '';
  const key = api_key || storedKey;
  const url = base_url || getSetting('ai_base_url') || 'https://opencode.ai/zen/v1';
  const mdl = (model || getSetting('ai_model') || 'opencode/deepseek-v4-flash-free').replace(/^[^/]+\//, '');
  const isFree = !key || key.trim().length < 5;

  try {
    const cleanUrl = url.replace(/\/+$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isFree) headers['Authorization'] = `Bearer ${key}`;

    const response = await fetch(`${cleanUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers,
      body: JSON.stringify({
        model: mdl,
        messages: [{ role: 'user', content: 'Responda apenas com a palavra OK' }],
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.json({ success: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}` });
    }

    const data = await response.json() as any;
    const reply = data.choices?.[0]?.message?.content || '';
    res.json({ success: true, reply: reply.trim() });
  } catch (e: any) {
    res.json({ success: false, error: e.message || 'Erro de conexão' });
  }
});

export default router;
