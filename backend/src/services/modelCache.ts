import { logger } from '../lib/logger';

const ZEN_MODELS_URL = 'https://opencode.ai/zen/v1/models';
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const WHITELIST = new Set([
  'opencode/deepseek-v4-flash-free',
  'opencode/mimo-v2.5-free',
  'opencode/north-mini-code-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/big-pickle',
]);

let cachedModels: string[] = [...WHITELIST];
let refreshTimer: ReturnType<typeof setInterval> | null = null;

async function fetchFreeModels(): Promise<string[]> {
  try {
    const res = await fetch(ZEN_MODELS_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as any;
    const models: any[] = json.data || json.models || [];
    const matched = models
      .filter((m: any) => WHITELIST.has(m.id))
      .map((m: any) => m.id);
    return matched.length > 0 ? matched : [...WHITELIST];
  } catch (e) {
    logger.error('Erro ao buscar modelos do Zen', e);
    return [...WHITELIST];
  }
}

async function refreshCache(): Promise<void> {
  const models = await fetchFreeModels();
  cachedModels = models;
  logger.info('Modelos gratuitos carregados', { count: models.length });
}

export function getFreeModels(): string[] {
  return [...cachedModels];
}

export function startModelCache(): void {
  refreshCache();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshCache, REFRESH_INTERVAL_MS);
}
