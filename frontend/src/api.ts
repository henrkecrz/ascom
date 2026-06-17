export const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ? (import.meta as any).env.VITE_API_URL as string : ''

const TOKEN_KEY = 'plano_comunicacao_token'

function loadToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function saveToken(token: string | null): void {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY) } catch { }
}

export function getToken(): string | null {
  return loadToken()
}

function setToken(token: string): void {
  saveToken(token)
}

function clearToken(): void {
  saveToken(null)
}

async function request<T>(path: string, options: RequestInit & { timeout?: number } = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const { timeout = 35000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null

  const signal = options.signal ? anySignal(options.signal, controller.signal) : controller.signal

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      signal,
    })
    if (timeoutId) clearTimeout(timeoutId)

    if (res.status === 401) {
      clearToken()
      throw new Error('unauthorized')
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`API error: ${res.status} ${text.slice(0, 200)}`)
    }

    return res.json()
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId)
    throw err
  }
}

function anySignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'GET', signal })
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

async function del<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'DELETE', signal })
}

async function login(password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text ? text.slice(0, 200) : `HTTP ${res.status}`)
  }
  const data = await res.json()
  setToken(data.token)
  return data.token
}

function isLoggedIn(): boolean {
  return !!getToken()
}

function logout(): void {
  clearToken()
}

export type FileItem = { id: number; name: string; extension: string | null; size_formatted: string; category: string; has_text: boolean }
export type DashboardData = { totalFiles: number; totalSize: number; extractedCount: number; clusterCount: number; relationCount: number; categories: { name: string; count: number }[]; fileTypes: { extension: string; count: number }[]; recent: FileItem[] }
export type QueueStatus = { pending: number; processing: number; done: number; error: number; total: number; paused: boolean }
export type Protocol = { id: number; name: string; summary: string; keywords: string; lastModified: string }
export type Spokesperson = { id: number; name: string; persons: string[]; summary: string }
export type ChecklistItem = { order: number; step: string; status: string }
export type ChatMessage = { role: 'user' | 'assistant'; text: string; documents?: { id: number; name: string; docType: string; summary: string; planSection: string }[]; source?: string }
export type QuickQuestion = { question: string; intent: string }

import { PlanHealthData } from './types'

export const api = {
  get, post, del, login, logout, isLoggedIn,
  files: {
    list: (params?: Record<string, string>, signal?: AbortSignal) =>
      get<any>(`/api/files?${new URLSearchParams(params || '').toString()}`, signal),
    get: (id: number, signal?: AbortSignal) => get<any>(`/api/documents/${id}`, signal),
    related: (id: number, signal?: AbortSignal) => get<any[]>(`/api/documents/${id}/related`, signal),
  },
  dashboard: {
    overview: (signal?: AbortSignal) => get<any>('/api/operational/overview', signal),
    alerts: (signal?: AbortSignal) => get<any>('/api/operational/alerts', signal),
    sections: (signal?: AbortSignal) => get<any>('/api/operational/sections', signal),
    stats: (signal?: AbortSignal) => get<any>('/api/dashboard', signal),
  },
  search: {
    query: (q: string, signal?: AbortSignal) => get<any>(`/api/search?q=${encodeURIComponent(q)}`, signal),
  },
  consult: {
    ask: (question: string) => post<any>('/api/consult', { question }),
    quickQuestions: (signal?: AbortSignal) => get<any>('/api/consult/quick-answers', signal),
  },
  crisis: {
    protocols: (signal?: AbortSignal) => get<any>('/api/crisis/protocols', signal),
    spokespersons: (signal?: AbortSignal) => get<any>('/api/crisis/spokespersons', signal),
    checklistProgress: (signal?: AbortSignal) => get<any>('/api/crisis/checklist/progress', signal),
    saveChecklistProgress: (progress: Record<string, boolean>) =>
      request<any>('/api/crisis/checklist/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress }) }),
  },
  health: {
    get: (signal?: AbortSignal) => get<PlanHealthData>('/api/plan/health', signal),
    gaps: (signal?: AbortSignal) => get<any>('/api/plan/gaps', signal),
  },
  graph: {
    get: (signal?: AbortSignal) => get<any>('/api/graph', signal),
  },
  plan: {
    get: (signal?: AbortSignal) => get<any>('/api/plan', signal),
  },
  contacts: {
    list: (signal?: AbortSignal) => get<any>('/api/contacts', signal),
    create: (contact: any) => post<any>('/api/contacts', contact),
    delete: (id: number) => del<any>(`/api/contacts/${id}`),
  },
  settings: {
    get: (signal?: AbortSignal) => get<any>('/api/settings', signal),
    save: (data: any) => post<any>('/api/settings', data),
    models: (apiKey?: string, baseUrl?: string, signal?: AbortSignal) =>
      get<any>(`/api/settings/models?${new URLSearchParams({ apiKey: apiKey || '', baseUrl: baseUrl || '' })}`, signal),
    testModel: (data: { api_key: string; base_url: string; model: string }) =>
      post<any>('/api/settings/test-model', data),
  },
  structuredData: {
    list: (params?: Record<string, string>, signal?: AbortSignal) =>
      get<any>(`/api/structured-data?${new URLSearchParams(params || '').toString()}`, signal),
    schemas: (signal?: AbortSignal) => get<any>('/api/structured-data/schemas', signal),
    themes: (signal?: AbortSignal) => get<any>('/api/structured-data/themes', signal),
    delete: (id: number) => del<any>(`/api/structured-data/${id}`),
  },
  documentSections: {
    list: (fileId: number, signal?: AbortSignal) => get<any[]>(`/api/documents/${fileId}/sections`, signal),
  },
  knowledge: {
    relations: (params?: Record<string, string>, signal?: AbortSignal) =>
      get<any>(`/api/knowledge-graph?${new URLSearchParams(params || '').toString()}`, signal),
    network: (signal?: AbortSignal) => get<any>('/api/knowledge-graph/network', signal),
  },
  photos: {
    events: (signal?: AbortSignal) => get<any[]>('/api/photos/events', signal),
    event: (id: number, signal?: AbortSignal) => get<any>(`/api/photos/events/${id}`, signal),
    byDocument: (docId: number, signal?: AbortSignal) => get<any[]>(`/api/photos/by-document/${docId}`, signal),
    thumbUrl: (thumbPath: string) => `${API_BASE}/api/photos/thumbnail?path=${encodeURIComponent(thumbPath)}`,
    serveUrl: (sourcePath: string) => `${API_BASE}/api/photos/serve?path=${encodeURIComponent(sourcePath)}`,
    index: () => post<any>('/api/photos/index', {}),
    reindex: () => post<any>('/api/photos/reindex', {}),
  },
  dataSources: {
    list: (signal?: AbortSignal) => get<any[]>('/api/data-sources', signal),
    create: (data: { path: string; type: string; label: string; has_photos?: boolean }) =>
      post<any>('/api/data-sources', data),
    update: (id: number, data: any) =>
      request<any>(`/api/data-sources/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (id: number) => del<any>(`/api/data-sources/${id}`),
    browse: (dirPath?: string, signal?: AbortSignal) =>
      get<any[]>(`/api/data-sources/browse${dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''}`, signal),
  },
  importApi: {
    preview: (sourceId: number) =>
      request<any>('/api/import/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId }), timeout: 0 }),
    confirm: (sourceId: number, fileIndices?: number[], schemaOverrides?: any[]) =>
      request<any>('/api/import/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId, fileIndices, schemaOverrides }), timeout: 0 }),
    tables: (signal?: AbortSignal) => get<any[]>('/api/import/tables', signal),
    relationships: (signal?: AbortSignal) => get<any[]>('/api/import/relationships', signal),
    history: (signal?: AbortSignal) => get<any[]>('/api/import/history', signal),
    undo: (id: number) => request<any>(`/api/import/undo/${id}`, { method: 'POST' }),
  },
  calendar: {
    heatmap: (year?: number, signal?: AbortSignal) => get<any>(`/api/calendar/heatmap${year ? `?year=${year}` : ''}`, signal),
    checkDay: (date: string, docsAnalyzed?: number) =>
      request<any>('/api/calendar/check-day', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, docs_analyzed: docsAnalyzed }) }),
    uncheckDay: (date: string) =>
      request<any>('/api/calendar/check-day', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date }) }),
    checkMonth: (year: number, month: number) =>
      request<any>('/api/calendar/check-month', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year, month }) }),
    kpi: (year?: number, signal?: AbortSignal) => get<any>(`/api/calendar/kpi${year ? `?year=${year}` : ''}`, signal),
  },
  advisor: {
    summary: (year?: number, signal?: AbortSignal) => get<any>(`/api/advisor/summary${year ? `?year=${year}` : ''}`, signal),
    recommendations: (year?: number, signal?: AbortSignal) => get<any>(`/api/advisor/recommendations${year ? `?year=${year}` : ''}`, signal),
  },
  reports: {
    get: (signal?: AbortSignal) => get<any>('/api/reports', signal),
  },
  generator: {
    pressRelease: (data: any) => post<any>('/api/generator/press-release', data),
  },
  simulator: {
    scenarios: (category?: string, signal?: AbortSignal) =>
      get<any>(`/api/simulator/scenarios${category ? `?category=${encodeURIComponent(category)}` : ''}`, signal),
    categories: (signal?: AbortSignal) => get<any>('/api/simulator/categories', signal),
    evaluate: (scenarioId: number, optionId: string) =>
      post<any>('/api/simulator/evaluate', { scenarioId, optionId }),
  },
  talkingPoints: {
    list: (category?: string, signal?: AbortSignal) =>
      get<any>(`/api/talking-points${category ? `?category=${encodeURIComponent(category)}` : ''}`, signal),
    categories: (signal?: AbortSignal) => get<any>('/api/talking-points/categories', signal),
  },
  queue: {
    status: (signal?: AbortSignal) => get<any>('/api/queue/status', signal),
    current: (signal?: AbortSignal) => get<any>('/api/queue/current', signal),
    agents: (signal?: AbortSignal) => get<any>('/api/queue/agents', signal),
    agentLogs: (params?: Record<string, string>, signal?: AbortSignal) =>
      get<any>(`/api/queue/agent-logs?${new URLSearchParams(params || '').toString()}`, signal),
    start: () => post<any>('/api/queue/start', {}),
    pause: () => post<any>('/api/queue/pause', {}),
    resume: () => post<any>('/api/queue/resume', {}),
  },
  siteAgents: {
    list: (signal?: AbortSignal) => get<any>('/api/site-agents', signal),
    snapshots: (params?: Record<string, string>, signal?: AbortSignal) =>
      get<any>(`/api/site-agents/snapshots?${new URLSearchParams(params || '').toString()}`, signal),
    byArea: (area: string, signal?: AbortSignal) => get<any>(`/api/site-agents/snapshots/${encodeURIComponent(area)}`, signal),
    byPage: (area: string, page: string, signal?: AbortSignal) =>
      get<any>(`/api/site-agents/snapshots/${encodeURIComponent(area)}/${encodeURIComponent(page)}`, signal),
    run: (agents?: string[]) => post<any>('/api/site-agents/run', agents ? { agents } : {}),
  },
}