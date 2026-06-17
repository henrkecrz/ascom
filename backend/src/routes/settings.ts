import { Router, Request, Response } from 'express';
import { getSetting, setSetting } from '../database';
import { getFreeModels } from '../services/modelCache';
import { encrypt, decrypt } from '../lib/crypto';
import { getAIProfiles, saveAIProfiles, testAIProfile, maskCredential, AIPipelineScope } from '../services/aiProfile';

const router = Router();

router.get('/api/settings', (_req: Request, res: Response) => {
  const encrypted = getSetting('ai_api_key') || '';
  let masked = '';
  let hasKey = false;
  if (encrypted) {
    try {
      const value = decrypt(encrypted);
      masked = maskCredential(value);
      hasKey = value.trim().length > 5;
    } catch {}
  }

  res.json({
    ai_provider: getSetting('ai_provider') || 'opencode',
    ai_api_key: '',
    ai_api_key_masked: masked,
    ai_has_api_key: hasKey,
    ai_base_url: getSetting('ai_base_url') || 'https://opencode.ai/zen/v1',
    ai_model: getSetting('ai_model') || 'opencode/deepseek-v4-flash-free',
    ai_potency: getSetting('ai_potency') || '0.7',
    store_original_files: getSetting('store_original_files') || 'true',
    ai_profiles: getAIProfiles(),
  });
});

router.post('/api/settings', (req: Request, res: Response) => {
  const { ai_provider, ai_api_key, ai_base_url, ai_model, ai_potency, store_original_files } = req.body;

  if (ai_provider !== undefined) setSetting('ai_provider', String(ai_provider));
  if (ai_api_key !== undefined && String(ai_api_key).trim().length > 0) {
    setSetting('ai_api_key', encrypt(String(ai_api_key)));
  }
  if (ai_base_url !== undefined) setSetting('ai_base_url', String(ai_base_url));
  if (ai_model !== undefined) setSetting('ai_model', String(ai_model));
  if (ai_potency !== undefined) setSetting('ai_potency', String(ai_potency));
  if (store_original_files !== undefined) setSetting('store_original_files', store_original_files ? 'true' : 'false');

  res.json({ success: true });
});

router.get('/api/settings/ai-profiles', (_req: Request, res: Response) => {
  res.json({ profiles: getAIProfiles() });
});

router.post('/api/settings/ai-profiles', (req: Request, res: Response) => {
  const profiles = req.body?.profiles || {};
  saveAIProfiles(profiles);
  res.json({ success: true, profiles: getAIProfiles() });
});

router.post('/api/settings/ai-profiles/test', async (req: Request, res: Response) => {
  const scope = (req.body?.scope || 'interactive_agents') as AIPipelineScope;
  const allowed = ['interactive_agents', 'queue_agents', 'site_agents', 'default'];
  if (!allowed.includes(scope)) {
    return res.status(400).json({ success: false, error: 'Escopo de IA inválido' });
  }
  const result = await testAIProfile(scope, req.body?.profile);
  res.json(result);
});

router.get('/api/settings/models', async (_req: Request, res: Response) => {
  const models = getFreeModels();
  res.json({ models, all: models, filtered: true });
});

router.post('/api/settings/test-model', async (req: Request, res: Response) => {
  const result = await testAIProfile('default', {
    credential: req.body?.api_key,
    baseUrl: req.body?.base_url,
    model: req.body?.model,
    potency: 0.1,
  });
  res.json({ success: result.success, reply: result.reply, error: result.error });
});

export default router;
