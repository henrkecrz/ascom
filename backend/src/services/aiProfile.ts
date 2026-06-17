import { getSetting, setSetting } from '../database';
import { decrypt, encrypt } from '../lib/crypto';
import { logger } from '../lib/logger';
import { getProviderConfig, normalizeProvider } from './modelCache';

export type AIPipelineScope = 'interactive_agents' | 'queue_agents' | 'site_agents' | 'default';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PublicAIProfile {
  scope: AIPipelineScope;
  label: string;
  provider: string;
  hasCredential: boolean;
  credentialMasked: string;
  baseUrl: string;
  model: string;
  potency: number;
  enabled: boolean;
  maxConcurrency: number;
  fallbackUsed?: boolean;
}

export interface SaveAIProfileInput {
  provider?: string;
  credential?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  potency?: number | string;
  enabled?: boolean;
  maxConcurrency?: number | string;
}

interface ResolvedAIProfile extends PublicAIProfile {
  credential: string;
  normalizedModel: string;
}

const DEFINITIONS: Record<Exclude<AIPipelineScope, 'default'>, { label: string; prefix: string; defaultProvider: string; potency: number; enabled: boolean; maxConcurrency: number }> = {
  interactive_agents: { label: 'Agentes Interativos', prefix: 'ai_interactive', defaultProvider: 'opencode', potency: 0.5, enabled: true, maxConcurrency: 3 },
  queue_agents: { label: 'Agentes de Fila', prefix: 'ai_queue', defaultProvider: 'opencode', potency: 0.2, enabled: true, maxConcurrency: 2 },
  site_agents: { label: 'Site Agents', prefix: 'ai_site', defaultProvider: 'opencode', potency: 0.3, enabled: true, maxConcurrency: 1 },
};

export function maskCredential(value: string): string {
  if (!value || value.length < 8) return '';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function getSecret(settingName: string): string {
  const encrypted = getSetting(settingName) || '';
  if (!encrypted) return '';
  try { return decrypt(encrypted); } catch { return ''; }
}

function normalizeModel(provider: string, model: string): string {
  const value = String(model || '').trim();
  if (!value) return '';
  const normalizedProvider = normalizeProvider(provider);
  if (normalizedProvider === 'opencode') return value.replace(/^[^/]+\//, '');
  return value;
}

function toNumber(value: string | undefined | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value: string | undefined | null, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return value === 'true' || value === '1';
}

function getDefaultProfile(): ResolvedAIProfile {
  const provider = normalizeProvider(getSetting('ai_provider') || 'opencode');
  const config = getProviderConfig(provider);
  const credential = getSecret('ai_api_key');
  const model = getSetting('ai_model') || '';
  return {
    scope: 'default',
    label: 'Configuração Global',
    provider,
    credential,
    hasCredential: credential.trim().length > 5,
    credentialMasked: maskCredential(credential),
    baseUrl: getSetting('ai_base_url') || config.baseUrl,
    model,
    normalizedModel: normalizeModel(provider, model),
    potency: toNumber(getSetting('ai_potency'), 0.7),
    enabled: true,
    maxConcurrency: 1,
    fallbackUsed: false,
  };
}

function toPublic(profile: ResolvedAIProfile): PublicAIProfile {
  return {
    scope: profile.scope,
    label: profile.label,
    provider: profile.provider,
    hasCredential: profile.hasCredential,
    credentialMasked: profile.credentialMasked,
    baseUrl: profile.baseUrl,
    model: profile.model,
    potency: profile.potency,
    enabled: profile.enabled,
    maxConcurrency: profile.maxConcurrency,
    fallbackUsed: profile.fallbackUsed,
  };
}

export function getAIProfile(scope: AIPipelineScope): PublicAIProfile {
  return toPublic(resolveProfile(scope));
}

export function getAIProfiles(): Record<Exclude<AIPipelineScope, 'default'>, PublicAIProfile> {
  return {
    interactive_agents: getAIProfile('interactive_agents'),
    queue_agents: getAIProfile('queue_agents'),
    site_agents: getAIProfile('site_agents'),
  };
}

function resolveProfile(scope: AIPipelineScope): ResolvedAIProfile {
  if (scope === 'default') return getDefaultProfile();
  const def = DEFINITIONS[scope];
  const prefix = def.prefix;
  const credential = getSecret(`${prefix}_api_key`);
  const hasOwnConfig = Boolean(getSetting(`${prefix}_provider`) || getSetting(`${prefix}_base_url`) || getSetting(`${prefix}_model`) || credential);

  if (!hasOwnConfig) {
    const fallback = getDefaultProfile();
    return { ...fallback, scope, label: def.label, maxConcurrency: def.maxConcurrency, fallbackUsed: true };
  }

  const provider = normalizeProvider(getSetting(`${prefix}_provider`) || def.defaultProvider);
  const config = getProviderConfig(provider);
  const model = getSetting(`${prefix}_model`) || '';
  return {
    scope,
    label: def.label,
    provider,
    credential,
    hasCredential: credential.trim().length > 5,
    credentialMasked: maskCredential(credential),
    baseUrl: getSetting(`${prefix}_base_url`) || config.baseUrl,
    model,
    normalizedModel: normalizeModel(provider, model),
    potency: toNumber(getSetting(`${prefix}_potency`), def.potency),
    enabled: toBool(getSetting(`${prefix}_enabled`), def.enabled),
    maxConcurrency: Math.max(1, toNumber(getSetting(`${prefix}_max_concurrency`), def.maxConcurrency)),
    fallbackUsed: false,
  };
}

export function saveAIProfiles(input: Partial<Record<Exclude<AIPipelineScope, 'default'>, SaveAIProfileInput>>): void {
  for (const scope of Object.keys(DEFINITIONS) as Exclude<AIPipelineScope, 'default'>[]) {
    const profile = input[scope];
    if (!profile) continue;
    const prefix = DEFINITIONS[scope].prefix;
    const provider = profile.provider !== undefined ? normalizeProvider(profile.provider) : undefined;
    if (provider !== undefined) setSetting(`${prefix}_provider`, provider);
    if (profile.baseUrl !== undefined) setSetting(`${prefix}_base_url`, String(profile.baseUrl || ''));
    if (profile.model !== undefined) setSetting(`${prefix}_model`, String(profile.model || ''));
    if (profile.potency !== undefined) setSetting(`${prefix}_potency`, String(profile.potency));
    if (profile.enabled !== undefined) setSetting(`${prefix}_enabled`, profile.enabled ? 'true' : 'false');
    if (profile.maxConcurrency !== undefined) setSetting(`${prefix}_max_concurrency`, String(Math.max(1, Number(profile.maxConcurrency) || 1)));
    const credential = profile.credential ?? profile.apiKey;
    if (credential !== undefined && String(credential).trim().length > 0) {
      setSetting(`${prefix}_api_key`, encrypt(String(credential)));
    }
  }
}

async function callOllama(profile: ResolvedAIProfile, messages: ChatMessage[], options: { temperature?: number; maxTokens?: number; timeoutMs?: number }): Promise<string | null> {
  const baseUrl = profile.baseUrl.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    signal: AbortSignal.timeout(options.timeoutMs || 25000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: profile.normalizedModel,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? profile.potency,
        num_predict: options.maxTokens ?? 1200,
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    logger.warn('Falha na chamada Ollama', { model: profile.model, status: response.status, text: text.slice(0, 200) });
    return null;
  }
  const data = await response.json() as any;
  return data.message?.content || data.response || null;
}

async function callOpenAICompatible(profile: ResolvedAIProfile, messages: ChatMessage[], options: { temperature?: number; maxTokens?: number; timeoutMs?: number }): Promise<string | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (profile.hasCredential) headers.Authorization = ['Bear', 'er ', profile.credential].join('');
  const response = await fetch(`${profile.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(options.timeoutMs || 25000),
    headers,
    body: JSON.stringify({
      model: profile.normalizedModel,
      messages,
      temperature: options.temperature ?? profile.potency,
      max_tokens: options.maxTokens ?? 1200,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    logger.warn('Falha na chamada LLM compatível', { provider: profile.provider, model: profile.model, status: response.status, text: text.slice(0, 200) });
    return null;
  }
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || null;
}

export async function callScopedLLM(
  scope: AIPipelineScope,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const profile = resolveProfile(scope);
  if (!profile.enabled) return null;
  if (!profile.normalizedModel) {
    logger.warn('Perfil de IA sem modelo selecionado', { scope, provider: profile.provider });
    return null;
  }
  const startedAt = Date.now();
  try {
    const content = profile.provider === 'ollama'
      ? await callOllama(profile, messages, options)
      : await callOpenAICompatible(profile, messages, options);
    logger.info('Chamada LLM por perfil concluída', {
      scope,
      provider: profile.provider,
      model: profile.model,
      latencyMs: Date.now() - startedAt,
      fallbackUsed: profile.fallbackUsed,
      success: Boolean(content),
    });
    return content;
  } catch (err: any) {
    logger.warn('Erro na chamada LLM por perfil', { scope, provider: profile.provider, model: profile.model, message: err.message });
    return null;
  }
}

export async function testAIProfile(scope: AIPipelineScope, override?: SaveAIProfileInput): Promise<{ success: boolean; reply?: string; error?: string; profile: PublicAIProfile }> {
  const resolved = resolveProfile(scope);
  const provider = override?.provider !== undefined ? normalizeProvider(override.provider) : normalizeProvider(resolved.provider);
  const config = getProviderConfig(provider);
  const credential = override?.credential ?? override?.apiKey ?? resolved.credential;
  const model = override?.model !== undefined ? String(override.model || '') : (resolved.model || '');
  const profile: ResolvedAIProfile = {
    ...resolved,
    provider,
    credential,
    hasCredential: credential.trim().length > 5,
    credentialMasked: maskCredential(credential),
    baseUrl: override?.baseUrl !== undefined ? String(override.baseUrl || config.baseUrl) : (resolved.baseUrl || config.baseUrl),
    model,
    normalizedModel: normalizeModel(provider, model),
    potency: override?.potency !== undefined ? Number(override.potency) : resolved.potency,
    enabled: override?.enabled !== undefined ? Boolean(override.enabled) : resolved.enabled,
    maxConcurrency: override?.maxConcurrency !== undefined ? Number(override.maxConcurrency) : resolved.maxConcurrency,
  };

  if (!profile.enabled) return { success: false, error: 'Perfil desativado', profile: toPublic(profile) };
  if (!profile.normalizedModel) return { success: false, error: 'Selecione um modelo real antes de testar', profile: toPublic(profile) };

  try {
    const reply = profile.provider === 'ollama'
      ? await callOllama(profile, [{ role: 'user', content: 'Responda apenas com a palavra OK' }], { temperature: 0.1, maxTokens: 50, timeoutMs: 15000 })
      : await callOpenAICompatible(profile, [{ role: 'user', content: 'Responda apenas com a palavra OK' }], { temperature: 0.1, maxTokens: 50, timeoutMs: 15000 });
    if (!reply) return { success: false, error: 'Resposta vazia ou falha de conexão', profile: toPublic(profile) };
    return { success: true, reply: reply.trim(), profile: toPublic(profile) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de conexão', profile: toPublic(profile) };
  }
}
