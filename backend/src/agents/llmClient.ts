import { getSetting } from '../database';
import { decrypt } from '../lib/crypto';
import { logger } from '../lib/logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callAgentLLM(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  const encryptedKey = getSetting('ai_api_key');
  const apiKey = encryptedKey ? decrypt(encryptedKey) : '';
  const baseUrl = (getSetting('ai_base_url') || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
  const model = (getSetting('ai_model') || 'opencode/deepseek-v4-flash-free').replace(/^[^/]+\//, '');
  const hasValidKey = apiKey && apiKey.trim().length > 5;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hasValidKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(options.timeoutMs || 25000),
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1200,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.warn('Falha na chamada LLM dos agentes', { status: response.status, text: text.slice(0, 200) });
      return null;
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    logger.warn('Erro ao chamar LLM dos agentes', { message: err.message });
    return null;
  }
}

export function parseJsonFromLLM<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
