import { logger } from '../lib/logger';

export type AIProvider = 'opencode' | 'openrouter' | 'openai' | 'ollama';

export interface ProviderConfig {
  id: AIProvider;
  label: string;
  baseUrl: string;
  defaultModel: string;
  requiresCredential: boolean;
  modelEndpoint: string;
}

export const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  opencode: {
    id: 'opencode',
    label: 'OpenCode',
    baseUrl: 'https://opencode.ai/zen/v1',
    defaultModel: 'opencode/deepseek-v4-flash-free',
    requiresCredential: false,
    modelEndpoint: '/models',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    requiresCredential: false,
    modelEndpoint: '/models',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.5',
    requiresCredential: true,
    modelEndpoint: '/models',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2:latest',
    requiresCredential: false,
    modelEndpoint: '/api/tags',
  },
};

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const OPENCODE_WHITELIST = new Set([
  'opencode/deepseek-v4-flash-free',
  'opencode/mimo-v2.5-free',
  'opencode/north-mini-code-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/big-pickle',
]);

const FALLBACK_MODELS: Record<AIProvider, string[]> = {
  opencode: [...OPENCODE_WHITELIST],
  openrouter: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5'],
  openai: ['gpt-5.5', 'gpt-5.5-mini', 'gpt-4.1-mini', 'gpt-4o-mini'],
  ollama: ['llama3.2:latest', 'deepseek-r1:latest', 'qwen2.5:latest', 'mistral:latest'],
};

let cachedModels: Record<AIProvider, string[]> = {
  opencode: FALLBACK_MODELS.opencode,
  openrouter: FALLBACK_MODELS.openrouter,
  openai: FALLBACK_MODELS.openai,
  ollama: FALLBACK_MODELS.ollama,
};
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function normalizeProvider(provider?: string): AIProvider {
  const value = String(provider || 'opencode').toLowerCase().trim();
  if (value === 'operouter') return 'openrouter';
  if (value === 'open-router') return 'openrouter';
  if (value === 'open_ai') return 'openai';
  if (value === 'open-ai') return 'openai';
  if (value === 'ollama') return 'ollama';
  if (value === 'openrouter') return 'openrouter';
  if (value === 'openai') return 'openai';
  return 'opencode';
}

export function getProviderConfig(provider?: string): ProviderConfig {
  return PROVIDERS[normalizeProvider(provider)];
}

function normalizeModelId(provider: AIProvider, model: any): string | null {
  if (!model) return null;
  if (typeof model === 'string') return model;
  if (provider === 'ollama') return model.name || model.model || model.id || null;
  return model.id || model.name || model.model || null;
}

async function fetchProviderModels(providerInput: string, baseUrlInput?: string, credential?: string): Promise<string[]> {
  const provider = normalizeProvider(providerInput);
  const config = PROVIDERS[provider];
  const baseUrl = (baseUrlInput || config.baseUrl).replace(/\/+$/, '');
  const endpoint = provider === 'ollama' ? `${baseUrl}/api/tags` : `${baseUrl}/models`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (credential && provider !== 'ollama') headers.Authorization = `Bearer ${credential}`;

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(10000), headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as any;
    const rawModels: any[] = provider === 'ollama' ? (json.models || []) : (json.data || json.models || []);
    let models = rawModels.map((m) => normalizeModelId(provider, m)).filter(Boolean) as string[];

    if (provider === 'opencode') {
      const whitelisted = models.filter((id) => OPENCODE_WHITELIST.has(id));
      models = whitelisted.length > 0 ? whitelisted : [...OPENCODE_WHITELIST];
    }

    const unique = Array.from(new Set(models));
    return unique.length > 0 ? unique : FALLBACK_MODELS[provider];
  } catch (e: any) {
    logger.warn('Erro ao buscar modelos do provedor de IA', { provider, baseUrl, error: e.message });
    return FALLBACK_MODELS[provider];
  }
}

async function refreshCache(): Promise<void> {
  const opencode = await fetchProviderModels('opencode');
  const openrouter = await fetchProviderModels('openrouter');
  const ollama = await fetchProviderModels('ollama');
  cachedModels = {
    ...cachedModels,
    opencode,
    openrouter,
    ollama,
  };
  logger.info('Modelos de IA carregados por provedor', {
    opencode: opencode.length,
    openrouter: openrouter.length,
    ollama: ollama.length,
  });
}

export function getFreeModels(): string[] {
  return [...cachedModels.opencode];
}

export function getCachedProviderModels(provider?: string): string[] {
  return [...cachedModels[normalizeProvider(provider)]];
}

export async function getProviderModels(provider?: string, baseUrl?: string, credential?: string): Promise<string[]> {
  const normalized = normalizeProvider(provider);
  if (baseUrl || credential || normalized === 'openai') {
    return fetchProviderModels(normalized, baseUrl, credential);
  }
  return getCachedProviderModels(normalized);
}

export function listProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS);
}

export function startModelCache(): void {
  refreshCache();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshCache, REFRESH_INTERVAL_MS);
}
