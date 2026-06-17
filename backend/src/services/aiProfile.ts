import { getSetting, setSetting } from '../database';
import { decrypt, encrypt } from '../lib/crypto';
import { logger } from '../lib/logger';

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

const DEFINITIONS: Record<Exclude<AIPipelineScope, 'default'>, { label: string; prefix: string; defaults: { provider: string; baseUrl: string; model: string; potency: number; enabled: boolean; maxConcurrency: number } }> = {
  interactive_agents: { label: 'Agentes Interativos', prefix: 'ai_interactive', defaults: { provider: 'opencode', baseUrl: 'https://opencode.ai/zen/v1', model: 'opencode/deepseek-v4-flash-free', potency: 0.5, enabled: true, maxConcurrency: 3 } },
  queue_agents: { label: 'Agentes de Fila', prefix: 'ai_queue', defaults: { provider: 'opencode', baseUrl: 'https://opencode.ai/zen/v1', model: 'opencode/deepseek-v4-flash-free', potency: 0.2, enabled: true, maxConcurrency: 2 } },
  site_agents: { label: 'Site Agents', prefix: 'ai_site', defaults: { provider: 'opencode', baseUrl: 'https://opencode.ai/zen/v1', model: 'opencode/deepseek-v4-flash-free', potency: 0.3, enabled: true, maxConcurrency: 1 } },
};

const DEFAULT_BASE_URL = 'https://opencode.ai/zen/v1';
const DEFAULT_MODEL = 'opencode/deepseek-v4-flash-free';

export function maskCredential(value: string): string {
  if (!value || value.length < 8) return '';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function getSecret(settingName: string): string {
  const encrypted = getSetting(settingName) || '';
  if (!encrypted) return '';
  try { return decrypt(encrypted); } catch { return ''; }
}

function normalizeModel(model: string): string {
  return (model || DEFAULT_MODEL).replace(/^[^/]+\//, '');
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
  const credential = getSecret('ai_api_key');
  const model = getSetting('ai_model') || DEFAULT_MODEL;
  return {
    scope: 'default',
    label: 'Configuração Global',
    provider: getSetting('ai_provider') || 'opencode',
    credential,
    hasCredential: credential.trim().length > 5,
    credentialMasked: maskCredential(credential),
    baseUrl: getSetting('ai_base_url') || DEFAULT_BASE_URL,
    model,
    normalizedModel: normalizeModel(model),
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
    return { ...fallback, scope, label: def.label, maxConcurrency: def.defaults.maxConcurrency, fallbackUsed: true };
  }

  const model = getSetting(`${prefix}_model`) || def.defaults.model;
  return {
    scope,
    label: def.label,
    provider: getSetting(`${prefix}_provider`) || def.defaults.provider,
    credential,
    hasCredential: credential.trim().length > 5,
    credentialMasked: maskCredential(credential),
    baseUrl: getSetting(`${prefix}_base_url`) || def.defaults.baseUrl,
    model,
    normalizedModel: normalizeModel(model),
    potency: toNumber(getSetting(`${prefix}_potency`), def.defaults.potency),
    enabled: toBool(getSetting(`${prefix}_enabled`), def.defaults.enabled),
    maxConcurrency: Math.max(1, toNumber(getSetting(`${prefix}_max_concurrency`), def.defaults.maxConcurrency)),
    fallbackUsed: false,
  };
}

export function saveAIProfiles(input: Partial<Record<Exclude<AIPipelineScope, 'default'>, SaveAIProfileInput>>): void {
  for (const scope of Object.keys(DEFINITIONS) as Exclude<AIPipelineScope, 'default'>[]) {
    const profile = input[scope];
    if (!profile) continue;
    const prefix = DEFINITIONS[scope].prefix;
    if (profile.provider !== undefined) setSetting(`${prefix}_provider`, String(profile.provider));
    if (profile.baseUrl !== undefined) setSetting(`${prefix}_base_url`, String(profile.baseUrl));
    if (profile.model !== undefined) setSetting(`${prefix}_model`, String(profile.model));
    if (profile.potency !== undefined) setSetting(`${prefix}_potency`, String(profile.potency));
    if (profile.enabled !== undefined) setSetting(`${prefix}_enabled`, profile.enabled ? 'true' : 'false');
    if (profile.maxConcurrency !== undefined) setSetting(`${prefix}_max_concurrency`, String(Math.max(1, Number(profile.maxConcurrency) || 1)));
    const credential = profile.credential ?? profile.apiKey;
    if (credential !== undefined && String(credential).trim().length > 0) {
      setSetting(`${prefix}_api_key`, encrypt(String(credential)));
    }
  }
}

export async function callScopedLLM(
  scope: AIPipelineScope,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const profile = resolveProfile(scope);
  if (!profile.enabled) return null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (profile.hasCredential) headers.Authorization = `Bearer ${profile.credential}`;
  const startedAt = Date.now();

  try {
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
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.warn('Falha na chamada LLM por perfil', { scope, provider: profile.provider, model: profile.model, status: response.status, latencyMs, text: text.slice(0, 200) });
      return null;
    }
    const data = await response.json() as any;
    logger.info('Chamada LLM por perfil concluída', { scope, provider: profile.provider, model: profile.model, latencyMs, fallbackUsed: profile.fallbackUsed });
    return data.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    logger.warn('Erro na chamada LLM por perfil', { scope, provider: profile.provider, model: profile.model, message: err.message });
    return null;
  }
}

export async function testAIProfile(scope: AIPipelineScope, override?: SaveAIProfileInput): Promise<{ success: boolean; reply?: string; error?: string; profile: PublicAIProfile }> {
  const resolved = resolveProfile(scope);
  const credential = override?.credential ?? override?.apiKey ?? resolved.credential;
  const model = override?.model !== undefined ? String(override.model) : resolved.model;
  const profile: ResolvedAIProfile = {
    ...resolved,
    provider: override?.provider !== undefined ? String(override.provider) : resolved.provider,
    credential,
    hasCredential: credential.trim().length > 5,
    credentialMasked: maskCredential(credential),
    baseUrl: override?.baseUrl !== undefined ? String(override.baseUrl) : resolved.baseUrl,
    model,
    normalizedModel: normalizeModel(model),
    potency: override?.potency !== undefined ? Number(override.potency) : resolved.potency,
    enabled: override?.enabled !== undefined ? Boolean(override.enabled) : resolved.enabled,
    maxConcurrency: override?.maxConcurrency !== undefined ? Number(override.maxConcurrency) : resolved.maxConcurrency,
  };

  if (!profile.enabled) return { success: false, error: 'Perfil desativado', profile: toPublic(profile) };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (profile.hasCredential) headers.Authorization = `Bearer ${profile.credential}`;

  try {
    const response = await fetch(`${profile.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers,
      body: JSON.stringify({
        model: profile.normalizedModel,
        messages: [{ role: 'user', content: 'Responda apenas com a palavra OK' }],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { success: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}`, profile: toPublic(profile) };
    }
    const data = await response.json() as any;
    const reply = data.choices?.[0]?.message?.content || '';
    return { success: true, reply: reply.trim(), profile: toPublic(profile) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de conexão', profile: toPublic(profile) };
  }
}
