import { callScopedLLM } from '../services/aiProfile';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callAgentLLM(messages: ChatMessage[], options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}): Promise<string | null> {
  return callScopedLLM('interactive_agents', messages, options);
}

export function parseJsonFromLLM<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
