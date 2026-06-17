import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { AlertTriangle, Clock, FileText, CheckCircle2, ChevronRight, Copy, Download } from 'lucide-react'
import { api } from '../api'
import { ConsultChat } from '../pages/ConsultChat'

interface CrisisActiveWorkspaceProps {
  protocolId: number
  protocolName: string
  protocolSummary: string
  startTime: number
  onEndCrisis: () => void
  onSelectDoc: (id: number) => void
}

export function CrisisActiveWorkspace({ protocolId, protocolName, protocolSummary, startTime, onEndCrisis, onSelectDoc }: CrisisActiveWorkspaceProps) {
  const { theme } = useTheme()
  const crisisColor = 'oklch(58% 0.19 30)'
  const crisisBg = 'oklch(58% 0.19 30 / 0.08)'

  const [elapsed, setElapsed] = useState<string>('00:00:00')
  const [title, setTitle] = useState('')
  const [facts, setFacts] = useState('')
  const [actions, setActions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [noteResult, setNoteResult] = useState('')
  const [copied, setCopied] = useState(false)

  // Timer
  useEffect(() => {
    const updateTimer = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000)
      const h = Math.floor(diff / 3600).toString().padStart(2, '0')
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }
    updateTimer()
    const int = setInterval(updateTimer, 1000)
    return () => clearInterval(int)
  }, [startTime])

  const handleGenerateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    try {
      const res = await api.generator.pressRelease({
        docId: protocolId,
        title: title || `NOTA OFICIAL: ${protocolName}`,
        facts,
        actions,
        location: 'Brasília - DF',
        date: new Date().toLocaleDateString('pt-BR')
      })
      setNoteResult(res.pressRelease)
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(noteResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([noteResult], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nota_oficial_crise_${new Date().getTime()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ 
        background: crisisBg, 
        border: `1px solid ${crisisColor}40`, 
        borderRadius: theme.radius.lg, 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            background: crisisColor, 
            color: '#fff', 
            padding: 12, 
            borderRadius: '50%',
            animation: 'crisisPulse 1.5s infinite' 
          }}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: crisisColor, textTransform: 'uppercase', letterSpacing: 1 }}>
              Incidente Ativo
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {protocolName}
            </h2>
            {protocolSummary && (
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {protocolSummary}
              </p>
            )}
            <div style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              marginTop: 6, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }} onClick={() => onSelectDoc(protocolId)}>
              <FileText size={14} /> Ver documento do protocolo original <ChevronRight size={14} />
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', color: crisisColor }}>
            <Clock size={16} />
            <span style={{ fontSize: '1.8rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {elapsed}
            </span>
          </div>
          <button onClick={onEndCrisis} style={{
            marginTop: 8,
            padding: '6px 14px',
            background: 'transparent',
            border: `1px solid ${crisisColor}`,
            color: crisisColor,
            borderRadius: theme.radius.sm,
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}>
            ENCERRAR INCIDENTE
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left Column: Quick Note Generator & Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              📝 Resposta Rápida (Nota Oficial)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Gere a primeira nota oficial em segundos, baseada nas diretrizes do protocolo <strong>{protocolName}</strong>.
            </p>

            <form onSubmit={handleGenerateNote} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Título (Opcional)</label>
                <input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder={`Ex: NOTA OFICIAL: ${protocolName}`}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: theme.radius.sm, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Fatos Ocorridos *</label>
                <textarea 
                  required
                  value={facts} 
                  onChange={e => setFacts(e.target.value)} 
                  placeholder="Descreva resumidamente o que aconteceu..."
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: theme.radius.sm, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Ações Imediatas da Novacap *</label>
                <textarea 
                  required
                  value={actions} 
                  onChange={e => setActions(e.target.value)} 
                  placeholder="O que já está sendo feito para resolver..."
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: theme.radius.sm, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <button type="submit" disabled={generating} style={{
                padding: '10px',
                background: crisisColor,
                color: '#fff',
                border: 'none',
                borderRadius: theme.radius.md,
                fontWeight: 700,
                cursor: generating ? 'wait' : 'pointer',
                opacity: generating ? 0.7 : 1
              }}>
                {generating ? 'GERANDO NOTA...' : 'GERAR NOTA OFICIAL'}
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Resultado da Nota
              </h3>
              {noteResult && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border-subtle)', padding: '4px 8px', borderRadius: theme.radius.sm, fontSize: '0.7rem', color: copied ? 'var(--color-success)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                    {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />} {copied ? 'COPIADO' : 'COPIAR'}
                  </button>
                  <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border-subtle)', padding: '4px 8px', borderRadius: theme.radius.sm, fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Download size={12} /> BAIXAR
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ 
              flex: 1, 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: theme.radius.md, 
              padding: 16,
              overflowY: 'auto',
              minHeight: 150,
              maxHeight: 250,
              whiteSpace: 'pre-wrap',
              fontSize: '0.85rem',
              color: noteResult ? 'var(--text-primary)' : 'var(--text-muted)'
            }}>
              {noteResult ? noteResult : 'Preencha os dados e gere a nota para visualizar o resultado e copiar para a imprensa.'}
            </div>
          </div>
        </div>

        {/* Right Column: Consult Chat */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: crisisColor }}>
            🤖 Assistente de Crise (IA)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Consulte os documentos oficiais e os protocolos de crise para tirar dúvidas em tempo real.
          </p>
          <div style={{ flex: 1, border: '1px solid var(--border-subtle)', borderRadius: theme.radius.lg, overflow: 'hidden', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
            <ConsultChat onSelectDoc={onSelectDoc} />
          </div>
        </div>
      </div>
    </div>
  )
}
