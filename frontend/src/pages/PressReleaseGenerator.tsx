import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'
import { Download } from 'lucide-react'

interface Protocol { id: number; name: string }

export function PressReleaseGenerator() {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const premiumInput = { background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, color: theme.colors.text, padding: '10px 14px', fontSize: '0.85rem', fontFamily: theme.fonts.body, outline: 'none', transition: theme.transitions.fast, width: '100%', boxSizing: 'border-box' } as const
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [selectedProtocol, setSelectedProtocol] = useState<string>('')
  const [title, setTitle] = useState('')
  const [facts, setFacts] = useState('')
  const [location, setLocation] = useState('Brasília - DF')
  const [date, setDate] = useState(new Date().toLocaleDateString('pt-BR'))
  const [actions, setActions] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.crisis.protocols().then(d => setProtocols(d.protocols)).catch(console.error)
  }, [])

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    api.generator.pressRelease({
      docId: selectedProtocol ? parseInt(selectedProtocol, 10) : undefined,
      title,
      facts,
      location,
      date,
      actions
    }).then(d => {
      setResult(d.pressRelease)
    }).catch(console.error).finally(() => setLoading(false))
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nota_oficial_${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'novacap'}_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const wordCount = result ? result.trim().split(/\s+/).length : 0
  const readingTimeMin = Math.max(1, Math.round(wordCount / 200))

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>✍️ Rascunhador de Notas Oficiais</h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          Gerador automatizado de minutas de press release baseadas em protocolos da Novacap
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left Side: Form */}
        <form onSubmit={handleGenerate} style={{ ...cardBase, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>
              Protocolo Relacionado
            </label>
            <select value={selectedProtocol} onChange={e => setSelectedProtocol(e.target.value)}
              style={{ ...premiumInput, background: theme.colors.bg, color: theme.colors.text }}>
              <option value="">Selecione um protocolo (Opcional)</option>
              {protocols.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>
              Título do Comunicado *
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)} required style={premiumInput} placeholder="Ex: NOTA OFICIAL: Incidentes com Chuva" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>Local</label>
              <input value={location} onChange={e => setLocation(e.target.value)} style={premiumInput} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>Data</label>
              <input value={date} onChange={e => setDate(e.target.value)} style={premiumInput} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>
              Fatos Ocorridos (Descrição sucinta) *
            </label>
            <textarea value={facts} onChange={e => setFacts(e.target.value)} required rows={4}
              style={{ ...premiumInput, resize: 'none', width: '100%', fontFamily: 'inherit' }}
              placeholder="Ex: O rompimento de tubulação na via L2 Sul provocado por perfuração acidental durante obras da distribuidora local." />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>
              Medidas Adotadas / Resposta da Novacap *
            </label>
            <textarea value={actions} onChange={e => setActions(e.target.value)} required rows={3}
              style={{ ...premiumInput, resize: 'none', width: '100%', fontFamily: 'inherit' }}
              placeholder="Ex: Equipes da Novacap já foram deslocadas ao local com maquinário de reparo e a via foi parcialmente interditada em parceria com o Detran." />
          </div>

          <button type="submit" disabled={loading}
            style={{
              padding: '12px 0', border: 'none', borderRadius: theme.radius.md,
              background: theme.colors.gradient, color: '#fff', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.82rem', fontFamily: 'inherit',
              boxShadow: theme.shadows.glow, marginTop: 8
            }}>
            {loading ? 'Gerando...' : 'Gerar Minuta'}
          </button>
        </form>

        {/* Right Side: Output Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...cardBase, padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.colors.text }}>📋 Preview da Nota</span>
              {result && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleCopy}
                    style={{
                      padding: '4px 10px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm,
                      background: copied ? 'rgba(0, 200, 83, 0.1)' : 'transparent',
                      color: copied ? theme.colors.success : theme.colors.textSecondary,
                      cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, fontFamily: 'inherit',
                    }}>
                    {copied ? '✓ Copiado' : 'Copiar Texto'}
                  </button>
                  <button onClick={handleDownload}
                    style={{
                      padding: '4px 10px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm,
                      background: 'transparent', color: theme.colors.textSecondary,
                      cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.colors.accent; e.currentTarget.style.color = theme.colors.accent }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.color = theme.colors.textSecondary }}
                  >
                    <Download size={12} /> Baixar .txt
                  </button>
                </div>
              )}
            </div>

            <div style={{
              flex: 1, background: theme.colors.bg, border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md, padding: 16, overflowY: 'auto',
              minHeight: 300, display: 'flex', alignItems: result ? 'flex-start' : 'center',
              justifyContent: result ? 'flex-start' : 'center'
            }}>
              {result ? (
                <div>
                  {wordCount > 0 && (
                    <div style={{
                      display: 'flex', gap: 12, marginBottom: 12, padding: '8px 12px',
                      borderRadius: theme.radius.sm, background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.15)',
                    }}>
                      <span style={{ fontSize: '0.7rem', color: theme.colors.accent, fontWeight: 600 }}>
                        📝 {wordCount} palavras
                      </span>
                      <span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>|</span>
                      <span style={{ fontSize: '0.7rem', color: theme.colors.accent, fontWeight: 600 }}>
                        ⏱️ Leitura: ~{readingTimeMin} min
                      </span>
                    </div>
                  )}
                  <pre style={{
                    margin: 0, fontSize: '0.8rem', color: theme.colors.textSecondary,
                    lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit'
                  }}>{result}</pre>
                </div>
              ) : (
                <span style={{ fontSize: '0.78rem', color: theme.colors.textMuted }}>
                  Preencha os campos ao lado e clique em "Gerar Minuta" para ver o resultado.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
