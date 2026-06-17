import { useState, useEffect } from 'react'
import { api } from '../api'
import { useTheme } from '../ThemeContext'
import { Icons } from '../components/FlatIcons'
import { DataSourceManager } from '../components/DataSourceManager'
import { ImportManager } from '../components/ImportManager'

type Scope = 'interactive_agents' | 'queue_agents' | 'site_agents'
type ProviderId = 'openai' | 'openrouter' | 'opencode' | 'ollama'

type ProviderConfig = {
  id: ProviderId
  label: string
  baseUrl: string
  defaultModel: string
  requiresCredential: boolean
  modelEndpoint: string
}

type Profile = {
  scope: Scope
  label: string
  provider: ProviderId | string
  credential?: string
  hasCredential?: boolean
  credentialMasked?: string
  baseUrl: string
  model: string
  potency: number
  enabled: boolean
  maxConcurrency: number
  fallbackUsed?: boolean
}

const PROFILE_ORDER: Scope[] = ['interactive_agents', 'queue_agents', 'site_agents']

const FALLBACK_PROVIDERS: ProviderConfig[] = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-5.5', requiresCredential: true, modelEndpoint: '/models' },
  { id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o-mini', requiresCredential: false, modelEndpoint: '/models' },
  { id: 'opencode', label: 'OpenCode', baseUrl: 'https://opencode.ai/zen/v1', defaultModel: 'opencode/deepseek-v4-flash-free', requiresCredential: false, modelEndpoint: '/models' },
  { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434', defaultModel: 'llama3.2:latest', requiresCredential: false, modelEndpoint: '/api/tags' },
]

const PROFILE_HELP: Record<Scope, { title: string; description: string; usage: string }> = {
  interactive_agents: {
    title: 'Agentes Interativos',
    description: 'Usado para chat, consulta, crise, conteúdo, planejamento e respostas sob demanda.',
    usage: 'Recomendado: modelo de maior qualidade, temperatura 0.4 a 0.7, concorrência 3.',
  },
  queue_agents: {
    title: 'Agentes de Fila',
    description: 'Usado para classificação, estruturação de dados, simulação automática e análise em lote.',
    usage: 'Recomendado: modelo rápido/barato, temperatura 0.1 a 0.3, concorrência 2.',
  },
  site_agents: {
    title: 'Site Agents',
    description: 'Usado para snapshots do painel, resumos executivos, recomendações e atualização automática das páginas.',
    usage: 'Recomendado: modelo bom em síntese, temperatura 0.2 a 0.5, concorrência 1.',
  },
}

function defaultProfile(scope: Scope): Profile {
  const defaults: Record<Scope, Partial<Profile>> = {
    interactive_agents: { potency: 0.5, maxConcurrency: 3 },
    queue_agents: { potency: 0.2, maxConcurrency: 2 },
    site_agents: { potency: 0.3, maxConcurrency: 1 },
  }
  const opencode = FALLBACK_PROVIDERS.find(p => p.id === 'opencode')!
  return {
    scope,
    label: PROFILE_HELP[scope].title,
    provider: 'opencode',
    credential: '',
    hasCredential: false,
    credentialMasked: '',
    baseUrl: opencode.baseUrl,
    model: opencode.defaultModel,
    potency: defaults[scope].potency || 0.3,
    enabled: true,
    maxConcurrency: defaults[scope].maxConcurrency || 1,
  }
}

export function Settings() {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const premiumInput = { background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, color: theme.colors.text, padding: '10px 14px', fontSize: '0.85rem', fontFamily: theme.fonts.body, outline: 'none', transition: theme.transitions.fast, width: '100%', boxSizing: 'border-box' } as const
  const smallLabel = { display: 'block', fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: 6, fontWeight: 600 } as const

  const [profiles, setProfiles] = useState<Record<Scope, Profile>>({
    interactive_agents: defaultProfile('interactive_agents'),
    queue_agents: defaultProfile('queue_agents'),
    site_agents: defaultProfile('site_agents'),
  })
  const [providers, setProviders] = useState<ProviderConfig[]>(FALLBACK_PROVIDERS)
  const [modelOptions, setModelOptions] = useState<Record<Scope, string[]>>({ interactive_agents: [], queue_agents: [], site_agents: [] })
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({})
  const [storeOriginals, setStoreOriginals] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [importSourceId, setImportSourceId] = useState<number | null>(null)
  const [testingScope, setTestingScope] = useState<Scope | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; reply?: string; error?: string }>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  const getProvider = (providerId: string) => providers.find(p => p.id === providerId) || FALLBACK_PROVIDERS.find(p => p.id === providerId) || FALLBACK_PROVIDERS.find(p => p.id === 'opencode')!

  const loadModelsForProfile = async (scope: Scope, profileOverride?: Profile) => {
    const profile = profileOverride || profiles[scope]
    setLoadingModels(prev => ({ ...prev, [scope]: true }))
    try {
      const res = await api.post<any>('/api/settings/provider-models', {
        provider: profile.provider,
        baseUrl: profile.baseUrl,
        credential: profile.credential || undefined,
      })
      const models = Array.isArray(res?.models) ? res.models : []
      setModelOptions(prev => ({ ...prev, [scope]: models }))
      if (models.length > 0 && !models.includes(profile.model)) {
        updateProfile(scope, { model: models[0] })
      }
    } catch (e) {
      console.error(e)
      setModelOptions(prev => ({ ...prev, [scope]: [] }))
    } finally {
      setLoadingModels(prev => ({ ...prev, [scope]: false }))
    }
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      const [settingsData, profileData] = await Promise.all([
        api.settings.get(),
        api.get<any>('/api/settings/ai-profiles'),
      ])
      setStoreOriginals(settingsData?.store_original_files !== 'false')
      const providerList = Array.isArray(profileData?.providers) ? profileData.providers : (Array.isArray(settingsData?.providers) ? settingsData.providers : FALLBACK_PROVIDERS)
      setProviders(providerList)
      const incoming = profileData?.profiles || settingsData?.ai_profiles || {}
      const next = { ...profiles }
      for (const scope of PROFILE_ORDER) {
        const profileProvider = incoming[scope]?.provider || 'opencode'
        const providerConfig = providerList.find((p: ProviderConfig) => p.id === profileProvider) || FALLBACK_PROVIDERS.find(p => p.id === profileProvider) || FALLBACK_PROVIDERS[2]
        next[scope] = {
          ...defaultProfile(scope),
          ...(incoming[scope] || {}),
          provider: profileProvider,
          baseUrl: incoming[scope]?.baseUrl || providerConfig.baseUrl,
          model: incoming[scope]?.model || providerConfig.defaultModel,
          credential: '',
        }
      }
      setProfiles(next)
      for (const scope of PROFILE_ORDER) {
        loadModelsForProfile(scope, next[scope])
      }
    } catch (e) {
      console.error(e)
      setStatusMessage({ type: 'error', text: 'Erro ao carregar configurações de IA.' })
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = (scope: Scope, patch: Partial<Profile>) => {
    setProfiles(prev => ({ ...prev, [scope]: { ...prev[scope], ...patch } }))
  }

  const applyProvider = (scope: Scope, providerId: string) => {
    const provider = getProvider(providerId)
    const nextProfile = {
      ...profiles[scope],
      provider: provider.id,
      baseUrl: provider.baseUrl,
      model: provider.defaultModel,
      credential: profiles[scope].credential || '',
    }
    setProfiles(prev => ({ ...prev, [scope]: nextProfile }))
    setModelOptions(prev => ({ ...prev, [scope]: [] }))
    loadModelsForProfile(scope, nextProfile)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setStatusMessage(null)
      const payload: any = { profiles: {} }
      for (const scope of PROFILE_ORDER) {
        const profile = profiles[scope]
        payload.profiles[scope] = {
          provider: profile.provider,
          baseUrl: profile.baseUrl,
          model: profile.model,
          potency: profile.potency,
          enabled: profile.enabled,
          maxConcurrency: profile.maxConcurrency,
        }
        if (profile.credential && profile.credential.trim().length > 0) {
          payload.profiles[scope].credential = profile.credential.trim()
        }
      }
      await api.post('/api/settings/ai-profiles', payload)
      await api.settings.save({ store_original_files: storeOriginals })
      setStatusMessage({ type: 'success', text: 'Perfis de IA salvos com sucesso!' })
      await loadSettings()
    } catch (e) {
      console.error(e)
      setStatusMessage({ type: 'error', text: 'Erro ao salvar perfis de IA.' })
    } finally {
      setSaving(false)
    }
  }

  const testProfile = async (scope: Scope) => {
    setTestingScope(scope)
    setTestResults(prev => ({ ...prev, [scope]: undefined as any }))
    try {
      const profile = profiles[scope]
      const res = await api.post<any>('/api/settings/ai-profiles/test', {
        scope,
        profile: {
          provider: profile.provider,
          credential: profile.credential,
          baseUrl: profile.baseUrl,
          model: profile.model,
          potency: profile.potency,
          enabled: profile.enabled,
          maxConcurrency: profile.maxConcurrency,
        },
      })
      setTestResults(prev => ({ ...prev, [scope]: res }))
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [scope]: { success: false, error: e.message } }))
    } finally {
      setTestingScope(null)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: theme.colors.textMuted }}>Carregando configurações de inteligência artificial...</div>
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.Gear size={22} /> Configurações da IA
        </h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          Configure perfis independentes com OpenAI, OpenRouter, OpenCode ou Ollama para cada camada de agentes.
        </p>
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 16px', borderRadius: theme.radius.md, marginBottom: 20, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
          background: statusMessage.type === 'success' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 23, 68, 0.1)',
          border: `1px solid ${statusMessage.type === 'success' ? theme.colors.success : theme.colors.danger}`,
          color: statusMessage.type === 'success' ? theme.colors.success : theme.colors.danger,
        }}>
          <span>{statusMessage.type === 'success' ? <Icons.CheckCircle size={15} /> : <Icons.XCircle size={15} />}</span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      <DataSourceManager onScan={(sourceId) => setImportSourceId(sourceId)} />
      <ImportManager key={importSourceId} sourceId={importSourceId} />

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {PROFILE_ORDER.map(scope => {
          const profile = profiles[scope]
          const help = PROFILE_HELP[scope]
          const provider = getProvider(profile.provider)
          const result = testResults[scope]
          const models = modelOptions[scope] || []
          return (
            <div key={scope} style={{ ...cardBase, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icons.Brain size={16} /> {help.title}
                  </h2>
                  <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: '0.8rem' }}>{help.description}</p>
                  <p style={{ margin: '6px 0 0', color: theme.colors.textMuted, fontSize: '0.75rem' }}>{help.usage}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.colors.textSecondary, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={profile.enabled} onChange={e => updateProfile(scope, { enabled: e.target.checked })} />
                  Ativo
                </label>
              </div>

              {profile.hasCredential && !profile.credential && (
                <div style={{ padding: '8px 10px', borderRadius: theme.radius.sm, background: 'rgba(0, 200, 83, 0.08)', color: theme.colors.success, fontSize: '0.78rem' }}>
                  Chave cadastrada: {profile.credentialMasked || '••••'} — deixe o campo em branco para manter a chave atual.
                </div>
              )}

              {profile.fallbackUsed && (
                <div style={{ padding: '8px 10px', borderRadius: theme.radius.sm, background: 'rgba(255, 193, 7, 0.10)', color: theme.colors.accentLight, fontSize: '0.78rem' }}>
                  Este perfil ainda usa a configuração global antiga como fallback.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                <div>
                  <label style={smallLabel}>Provedor</label>
                  <select value={profile.provider} onChange={e => applyProvider(scope, e.target.value)} style={{ ...premiumInput, cursor: 'pointer' }}>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={smallLabel}>{provider.requiresCredential ? 'Nova chave de API' : profile.provider === 'ollama' ? 'Credencial (opcional)' : 'Chave de API (opcional)'}</label>
                  <input type="password" value={profile.credential || ''} onChange={e => updateProfile(scope, { credential: e.target.value })} placeholder={profile.hasCredential ? 'Deixe em branco para manter a chave atual' : profile.provider === 'ollama' ? 'Ollama local normalmente não usa chave' : 'Insira a chave deste perfil'} style={premiumInput} />
                </div>
              </div>

              <div>
                <label style={smallLabel}>Base URL</label>
                <input value={profile.baseUrl} onChange={e => updateProfile(scope, { baseUrl: e.target.value })} placeholder={provider.baseUrl} style={premiumInput} />
                <p style={{ margin: '6px 0 0', color: theme.colors.textMuted, fontSize: '0.72rem' }}>
                  Padrão de {provider.label}: {provider.baseUrl} · Modelos: {provider.modelEndpoint}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={smallLabel}>Modelo</label>
                  <input list={`models-${scope}`} value={profile.model} onChange={e => updateProfile(scope, { model: e.target.value })} placeholder={provider.defaultModel} style={premiumInput} />
                  <datalist id={`models-${scope}`}>
                    {models.map(model => <option key={model} value={model} />)}
                  </datalist>
                </div>
                <div>
                  <label style={smallLabel}>Temperatura ({Number(profile.potency).toFixed(1)})</label>
                  <input type="range" min="0" max="1" step="0.1" value={profile.potency} onChange={e => updateProfile(scope, { potency: Number(e.target.value) })} style={{ width: '100%', accentColor: theme.colors.accent }} />
                </div>
                <div>
                  <label style={smallLabel}>Concorrência</label>
                  <input type="number" min="1" max="10" value={profile.maxConcurrency} onChange={e => updateProfile(scope, { maxConcurrency: Number(e.target.value) })} style={premiumInput} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => loadModelsForProfile(scope)} disabled={loadingModels[scope]} style={{
                  padding: '9px 14px', borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`, background: theme.colors.bgElevated, color: theme.colors.text, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}>
                  {loadingModels[scope] ? 'Carregando modelos...' : `Carregar modelos de ${provider.label}`}
                </button>
                <button type="button" onClick={() => testProfile(scope)} disabled={testingScope === scope} style={{
                  padding: '9px 14px', borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`, background: theme.colors.bgElevated, color: theme.colors.text, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}>
                  {testingScope === scope ? 'Testando...' : `Testar ${help.title}`}
                </button>
              </div>

              {models.length > 0 && (
                <div style={{ color: theme.colors.textMuted, fontSize: '0.72rem' }}>
                  {models.length} modelo(s) carregado(s) para {provider.label}. Digite ou selecione usando a lista do campo Modelo.
                </div>
              )}

              {result && (
                <div style={{
                  padding: '10px 12px', borderRadius: theme.radius.sm, fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: result.success ? 'rgba(0, 200, 83, 0.08)' : 'rgba(255, 23, 68, 0.08)',
                  border: `1px solid ${result.success ? theme.colors.success : theme.colors.danger}`,
                  color: result.success ? theme.colors.success : theme.colors.danger,
                }}>
                  <span>{result.success ? '✅' : '❌'}</span>
                  <span>{result.success ? `Modelo respondeu: "${result.reply}"` : `Falha: ${result.error}`}</span>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ ...cardBase, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icons.Doc size={16} /> Armazenar Arquivos Originais
              </h2>
              <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: '0.8rem' }}>
                Quando ativo, os arquivos originais são copiados para o banco para permitir visualização mesmo se a pasta de rede estiver offline.
              </p>
            </div>
            <input type="checkbox" checked={storeOriginals} onChange={e => setStoreOriginals(e.target.checked)} style={{ width: 22, height: 22 }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={() => { api.logout(); window.location.reload(); }} style={{ padding: '10px 20px', borderRadius: theme.radius.md, background: 'transparent', border: `1px solid ${theme.colors.border}`, color: theme.colors.textSecondary, cursor: 'pointer', fontWeight: 500, fontSize: '0.8rem', fontFamily: theme.fonts.body }}>
            Sair
          </button>
          <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: theme.radius.md, background: theme.colors.gradient, color: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: theme.shadows.glow, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar Perfis de IA'}
          </button>
        </div>
      </form>
    </div>
  )
}
