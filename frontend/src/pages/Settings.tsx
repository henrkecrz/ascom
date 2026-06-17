import { useState, useEffect } from 'react'
import { api } from '../api'
import { useTheme } from '../ThemeContext'
import { Icons } from '../components/FlatIcons'
import { DataSourceManager } from '../components/DataSourceManager'
import { ImportManager } from '../components/ImportManager'

export function Settings() {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const premiumInput = { background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, color: theme.colors.text, padding: '10px 14px', fontSize: '0.85rem', fontFamily: theme.fonts.body, outline: 'none', transition: theme.transitions.fast, width: '100%', boxSizing: 'border-box' } as const
  const [provider, setProvider] = useState('opencode')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [baseUrl, setBaseUrl] = useState('https://opencode.ai/zen/v1')
  const [model, setModel] = useState('opencode/deepseek-v4-flash-free')
  const [potency, setPotency] = useState(0.7)
  const [storeOriginals, setStoreOriginals] = useState(true)
  
  // Real-time models state
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [onlyFree, setOnlyFree] = useState(true)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [testingModel, setTestingModel] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; reply?: string; error?: string } | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [importSourceId, setImportSourceId] = useState<number | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  // Fetch models automatically when apiKey or baseUrl changes and is valid
  useEffect(() => {
    if (apiKey.trim().length > 5 && baseUrl.trim().length > 5) {
      const timer = setTimeout(() => {
        getAvailableModels(apiKey, baseUrl)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [apiKey, baseUrl])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await api.settings.get()
      if (data) {
        setProvider(data.ai_provider || 'opencode')
        setApiKey(data.ai_api_key || '')
        setBaseUrl(data.ai_base_url || 'https://openrouter.ai/api/v1')
        setModel(data.ai_model || 'meta-llama/llama-3.2-3b-instruct:free')
        setPotency(Number(data.ai_potency) || 0.7)
        setStoreOriginals(data.store_original_files !== 'false')
        
        if (data.ai_api_key && data.ai_base_url) {
          await getAvailableModels(data.ai_api_key, data.ai_base_url, data.ai_model)
        }
      }
    } catch (e) {
      console.error(e)
      setStatusMessage({ type: 'error', text: 'Erro ao carregar configurações do banco de dados.' })
    } finally {
      setLoading(false)
    }
  }

  const getAvailableModels = async (key: string, url: string, activeModel?: string) => {
    try {
      setFetchingModels(true)
      const res = await api.settings.models(key, url)
      
      // If we got models back
      if (res && res.all) {
        setAvailableModels(res.all)
        // If current model is not in the list, and list is not empty, set to first model
        const currentModel = activeModel || model
        if (res.all.length > 0 && !res.all.includes(currentModel)) {
          // If onlyFree is on, try to pick first free model, otherwise first of all
          const free = res.all.filter((m: string) => m.toLowerCase().includes('free'))
          if (free.length > 0) {
            setModel(free[0])
          } else {
            setModel(res.all[0])
          }
        }
      } else if (res && res.models) {
        setAvailableModels(res.models)
      }
    } catch (e) {
      console.error('Erro ao buscar modelos:', e)
    } finally {
      setFetchingModels(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setStatusMessage(null)
      await api.settings.save({
        ai_provider: provider,
        ai_api_key: apiKey,
        ai_base_url: baseUrl,
        ai_model: model,
        ai_potency: String(potency),
        store_original_files: storeOriginals
      })
      setStatusMessage({ type: 'success', text: 'Configurações salvas com sucesso no banco de dados!' })
    } catch (e) {
      console.error(e)
      setStatusMessage({ type: 'error', text: 'Erro ao salvar configurações no banco de dados.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: theme.colors.textMuted }}>
        Carregando configurações de inteligência artificial...
      </div>
    )
  }

  const displayedModels = onlyFree 
    ? availableModels.filter(m => m.toLowerCase().includes('free'))
    : availableModels

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.Gear size={22} /> Configurações da IA
        </h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          Gerencie o provedor de IA, chaves de API, modelos de linguagem e potência da inteligência artificial para o chat de consulta.
        </p>
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: theme.radius.md,
          marginBottom: 20,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: statusMessage.type === 'success' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 23, 68, 0.1)',
          border: `1px solid ${statusMessage.type === 'success' ? theme.colors.success : theme.colors.danger}`,
          color: statusMessage.type === 'success' ? theme.colors.success : theme.colors.danger,
        }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {statusMessage.type === 'success' ? <Icons.CheckCircle size={15} /> : <Icons.XCircle size={15} />}
          </span>
          <span>{statusMessage.text}</span>
        </div>
      )}

      <DataSourceManager onScan={(sourceId) => setImportSourceId(sourceId)} />

      <ImportManager key={importSourceId} sourceId={importSourceId} />

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Provedor e Chave */}
        <div style={{ ...cardBase, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icons.Doc size={16} /> Conexão & Autenticação
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: 6, fontWeight: 600 }}>
                Provedor de IA
              </label>
              <select 
                value={provider}
                onChange={e => setProvider(e.target.value)}
                style={{
                  ...premiumInput,
                  padding: '8px 12px',
                  background: theme.colors.bgElevated,
                  color: theme.colors.text,
                  cursor: 'pointer'
                }}
              >
                <option value="opencode">OpenCode</option>
                <option value="openai">OpenAI (Compatível)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: 6, fontWeight: 600 }}>
                Chave de API (API Key)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Insira sua chave sk-..."
                  style={{ ...premiumInput, paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: theme.colors.textMuted,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: 4
                  }}
                  title={showApiKey ? 'Ocultar Chave' : 'Exibir Chave'}
                >
                  {showApiKey ? '👁️' : '🕶️'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: 6, fontWeight: 600 }}>
              Endereço Base (Base URL)
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
              style={premiumInput}
              required
            />
          </div>
        </div>

        {/* Modelo e Parâmetros */}
        <div style={{ ...cardBase, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icons.Brain size={16} /> Configurações do Modelo
            </h2>
            <button
              type="button"
              onClick={() => getAvailableModels(apiKey, baseUrl)}
              disabled={fetchingModels || apiKey.trim().length < 5}
              style={{
                fontSize: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text,
                padding: '4px 10px',
                borderRadius: theme.radius.sm,
                cursor: 'pointer',
                transition: theme.transitions.fast,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {fetchingModels ? '⏳ Buscando...' : '🔄 Sincronizar Modelos'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, fontWeight: 600 }}>
                Modelo Selecionado
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: theme.colors.success, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={onlyFree}
                  onChange={e => setOnlyFree(e.target.checked)}
                  style={{ accentColor: theme.colors.success, cursor: 'pointer' }}
                />
                Exibir apenas gratuitos (Free)
              </label>
            </div>

            {displayedModels.length > 0 ? (
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{
                  ...premiumInput,
                  padding: '8px 12px',
                  background: theme.colors.bgElevated,
                  color: theme.colors.text,
                  cursor: 'pointer'
                }}
              >
                {displayedModels.map(m => (
                  <option key={m} value={m}>
                    {m} {m.toLowerCase().includes('free') ? '🟢 (Gratuito)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="Insira o ID do modelo"
                  style={premiumInput}
                  required
                />
                <p style={{ margin: '4px 0 0', color: theme.colors.textMuted, fontSize: '0.7rem' }}>
                  Nenhum modelo gratuito localizado em tempo real. Digite acima ou clique em Sincronizar Modelos.
                </p>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={async () => {
                setTestingModel(true)
                setTestResult(null)
                try {
                  const res = await api.settings.testModel({ api_key: apiKey, base_url: baseUrl, model })
                  setTestResult(res)
                } catch (e: any) {
                  setTestResult({ success: false, error: e.message })
                } finally {
                  setTestingModel(false)
                }
              }}
              disabled={testingModel || apiKey.trim().length < 5}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.bgElevated,
                color: theme.colors.text,
                cursor: apiKey.trim().length < 5 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                opacity: apiKey.trim().length < 5 ? 0.5 : 1,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {testingModel ? '⏳ Testando...' : '🔌 Testar Conexão com o Modelo'}
            </button>
            {testResult && (
              <div style={{
                marginTop: 8,
                padding: '10px 12px',
                borderRadius: theme.radius.sm,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                background: testResult.success ? 'rgba(0, 200, 83, 0.08)' : 'rgba(255, 23, 68, 0.08)',
                border: `1px solid ${testResult.success ? theme.colors.success : theme.colors.danger}`,
                color: testResult.success ? theme.colors.success : theme.colors.danger,
              }}>
                <span>{testResult.success ? '✅' : '❌'}</span>
                <span>{testResult.success ? `Modelo respondeu: "${testResult.reply}"` : `Falha: ${testResult.error}`}</span>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, fontWeight: 600 }}>
                Potência da IA (Temperatura: {potency.toFixed(1)})
              </label>
              <span style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: 4,
                background: potency > 0.7 ? `${theme.colors.danger}22` : potency > 0.4 ? `${theme.colors.accent}22` : 'rgba(0, 200, 83, 0.1)',
                color: potency > 0.7 ? theme.colors.danger : potency > 0.4 ? theme.colors.accentLight : theme.colors.success,
                fontWeight: 'bold'
              }}>
                {potency <= 0.3 ? 'Determinístico (Mais preciso)' : potency <= 0.7 ? 'Balanceado (Recomendado)' : 'Criativo (Mais inventivo)'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.75rem', color: theme.colors.textMuted }}>Mínima (0.0)</span>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={potency}
                onChange={e => setPotency(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: theme.colors.accent,
                  cursor: 'pointer',
                  height: 6,
                  borderRadius: 3
                }}
              />
              <span style={{ fontSize: '0.75rem', color: theme.colors.textMuted }}>Máxima (1.0)</span>
            </div>
          </div>
        </div>

        {/* Armazenamento de Originais */}
        <div style={{ ...cardBase, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icons.Doc size={16} /> Armazenar Arquivos Originais
              </h2>
              <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: '0.8rem' }}>
                Quando ativo, os arquivos originais (PDF, DOCX, imagens, etc.) são copiados para o banco de dados.
                Permite visualização mesmo se a pasta de rede estiver offline. Arquivos acima de 50 MB não são armazenados.
              </p>
            </div>
            <label style={{
              position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer', flexShrink: 0,
            }}>
              <input
                type="checkbox"
                checked={storeOriginals}
                onChange={e => setStoreOriginals(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 26,
                transition: theme.transitions.fast,
                background: storeOriginals ? theme.colors.success : theme.colors.border,
              }}>
                <span style={{
                  position: 'absolute', width: 22, height: 22, borderRadius: '50%', top: 2,
                  transition: theme.transitions.fast, background: 'white',
                  left: storeOriginals ? 24 : 2,
                }} />
              </span>
            </label>
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <button onClick={() => { api.logout(); window.location.reload(); }}
            style={{
              padding: '10px 20px', borderRadius: theme.radius.md,
              background: 'transparent', border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textSecondary, cursor: 'pointer',
              fontWeight: 500, fontSize: '0.8rem', fontFamily: theme.fonts.body,
              transition: theme.transitions.fast,
            }}>
            Sair
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 24px',
              borderRadius: theme.radius.md,
              background: theme.colors.gradient,
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: theme.shadows.glow,
              opacity: saving ? 0.7 : 1,
              transition: theme.transitions.fast,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  )
}
