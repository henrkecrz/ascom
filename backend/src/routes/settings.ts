import { Router, Request, Response } from 'express';
import { getSetting, setSetting } from '../database';
import { encrypt, decrypt } from '../lib/crypto';
import { getAIProfiles, saveAIProfiles, testAIProfile, maskCredential, AIPipelineScope } from '../services/aiProfile';
import { getProviderConfig, listProviders, normalizeProvider, AIProvider } from '../services/modelCache';

const router = Router();

function modelId(provider: AIProvider, model: any): string | null {
  if (!model) return null;
  if (typeof model === 'string') return model;
  if (provider === 'ollama') return model.name || model.model || model.id || null;
  return model.id || model.name || model.model || null;
}

function zeroPrice(value: any): boolean {
  if (value === undefined || value === null || value === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === 0;
}

function isOpenRouterFree(raw: any, id: string): boolean {
  const text = `${id} ${raw?.name || ''} ${raw?.description || ''}`.toLowerCase();
  if (text.includes(':free') || text.includes('(free)') || text.includes(' free')) return true;
  const pricing = raw?.pricing || {};
  return zeroPrice(pricing.prompt ?? pricing.input) && zeroPrice(pricing.completion ?? pricing.output);
}

function sortModels(provider: AIProvider, rawModels: any[]): string[] {
  if (provider === 'openrouter') {
    const items = rawModels
      .map((raw) => {
        const id = modelId(provider, raw);
        return id ? { id, free: isOpenRouterFree(raw, id) } : null;
      })
      .filter(Boolean) as { id: string; free: boolean }[];
    items.sort((a, b) => {
      if (a.free !== b.free) return a.free ? -1 : 1;
      return a.id.localeCompare(b.id, 'en');
    });
    return Array.from(new Set(items.map((item) => item.id)));
  }

  return Array.from(new Set(rawModels.map((raw) => modelId(provider, raw)).filter(Boolean) as string[]));
}

function profilePrefix(scope?: string): string | null {
  if (scope === 'interactive_agents') return 'ai_interactive';
  if (scope === 'queue_agents') return 'ai_queue';
  if (scope === 'site_agents') return 'ai_site';
  return null;
}

function storedCredential(scope?: string): string {
  const prefix = profilePrefix(scope);
  const encrypted = prefix ? getSetting(`${prefix}_api_key`) : getSetting('ai_api_key');
  if (!encrypted) return '';
  try { return decrypt(encrypted); } catch { return ''; }
}

async function fetchModelsForSettings(providerInput: string, baseUrlInput?: string, scope?: string, providedCredential?: string): Promise<{ models: string[]; error?: string }> {
  const provider = normalizeProvider(providerInput);
  const config = getProviderConfig(provider);
  const baseUrl = (baseUrlInput || config.baseUrl).replace(/\/+$/, '');
  const url = provider === 'ollama' ? `${baseUrl}/api/tags` : `${baseUrl}/models`;
  const authValue = providedCredential || storedCredential(scope);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authValue && provider !== 'ollama') headers.Authorization = ['Bear', 'er ', authValue].join('');

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), headers });
    if (!response.ok) return { models: [], error: `HTTP ${response.status}` };
    const json = await response.json() as any;
    const rawModels = provider === 'ollama' ? (json.models || []) : (json.data || json.models || []);
    return { models: sortModels(provider, rawModels) };
  } catch (e: any) {
    return { models: [], error: e.message || 'Erro ao buscar modelos do provedor' };
  }
}

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
  const provider = normalizeProvider(getSetting('ai_provider') || 'opencode');
  const config = getProviderConfig(provider);

  res.json({
    ai_provider: provider,
    ai_api_key: '',
    ai_api_key_masked: masked,
    ai_has_api_key: hasKey,
    ai_base_url: getSetting('ai_base_url') || config.baseUrl,
    ai_model: getSetting('ai_model') || '',
    ai_potency: getSetting('ai_potency') || '0.7',
    store_original_files: getSetting('store_original_files') || 'true',
    ai_profiles: getAIProfiles(),
    providers: listProviders(),
  });
});

router.post('/api/settings', (req: Request, res: Response) => {
  const { ai_provider, ai_api_key, ai_base_url, ai_model, ai_potency, store_original_files } = req.body;

  if (ai_provider !== undefined) setSetting('ai_provider', normalizeProvider(ai_provider));
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
  res.json({ profiles: getAIProfiles(), providers: listProviders() });
});

router.post('/api/settings/ai-profiles', (req: Request, res: Response) => {
  const profiles = req.body?.profiles || {};
  saveAIProfiles(profiles);
  res.json({ success: true, profiles: getAIProfiles(), providers: listProviders() });
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

router.get('/api/settings/providers', (_req: Request, res: Response) => {
  res.json({ providers: listProviders() });
});

router.get('/api/settings/models', async (req: Request, res: Response) => {
  const provider = normalizeProvider(String(req.query.provider || 'opencode'));
  const baseUrl = req.query.baseUrl ? String(req.query.baseUrl) : undefined;
  const scope = req.query.scope ? String(req.query.scope) : undefined;
  const result = await fetchModelsForSettings(provider, baseUrl, scope);
  res.json({ provider, models: result.models, all: result.models, filtered: false, error: result.error });
});

router.post('/api/settings/provider-models', async (req: Request, res: Response) => {
  const provider = normalizeProvider(req.body?.provider || 'opencode');
  const baseUrl = req.body?.baseUrl ? String(req.body.baseUrl) : undefined;
  const scope = req.body?.scope ? String(req.body.scope) : undefined;
  const providedCredential = req.body?.credential ? String(req.body.credential) : undefined;
  const result = await fetchModelsForSettings(provider, baseUrl, scope, providedCredential);
  res.json({ provider, models: result.models, all: result.models, filtered: false, error: result.error });
});

router.post('/api/settings/test-model', async (req: Request, res: Response) => {
  const result = await testAIProfile('default', {
    provider: req.body?.provider,
    credential: req.body?.api_key,
    baseUrl: req.body?.base_url,
    model: req.body?.model,
    potency: 0.1,
  });
  res.json({ success: result.success, reply: result.reply, error: result.error });
});

export default router;
