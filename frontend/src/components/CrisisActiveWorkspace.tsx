import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { AlertTriangle, Clock, FileText, CheckCircle2, Copy, Download } from 'lucide-react'
import { api } from '../api'
import { ConsultChat } from '../pages/ConsultChat'

interface CrisisActiveWorkspaceProps {
  protocolId: number
  protocolName: string
  protocolSummary: string
  startTime: number
  keywords?: string
  checklist: any[]
  checkedSteps: Record<number, boolean>
  onToggleStep: (order: number) => void
  spokespersons: any[]
  onEndCrisis: () => void
  onSelectDoc: (id: number) => void
}

export function CrisisActiveWorkspace({ protocolId, protocolName, protocolSummary, keywords, startTime, checklist, checkedSteps, onToggleStep, spokespersons, onEndCrisis, onSelectDoc }: CrisisActiveWorkspaceProps) {
  const { theme } = useTheme()
  const crisisColor = '#ff2a2a'
  const cardGradient = 'linear-gradient(180deg, rgba(30, 10, 10, 0.8) 0%, rgba(15, 5, 5, 0.9) 100%)'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 20px', color: '#fff' }}>
      {/* Dynamic Alert Header */}
      <div style={{ 
        background: `linear-gradient(90deg, ${crisisColor}20 0%, transparent 100%)`,
        borderLeft: `4px solid ${crisisColor}`,
        borderRadius: '0 12px 12px 0',
        padding: '24px 30px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: `inset 0 0 40px ${crisisColor}10, 0 10px 30px rgba(0,0,0,0.5)`,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <div style={{ 
            background: `linear-gradient(135deg, ${crisisColor} 0%, #a00000 100%)`,
            color: '#fff', 
            padding: 16, 
            borderRadius: '50%',
            boxShadow: `0 0 30px ${crisisColor}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: crisisColor, textTransform: 'uppercase', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: crisisColor, animation: 'pulse 1s infinite' }} />
                INCIDENTE ATIVO
              </div>
              {keywords && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {keywords.split(',').filter(Boolean).slice(0, 3).map((kw, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.2)' }}>{kw}</span>
                  ))}
                </div>
              )}
            </div>
            <h2 style={{ margin: '8px 0 4px', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {protocolName}
            </h2>
            {protocolSummary && (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', maxWidth: 700, lineHeight: 1.5 }}>
                {protocolSummary}
              </p>
            )}
            <button onClick={() => onSelectDoc(protocolId)} style={{ 
              background: 'transparent', border: 'none', color: crisisColor, fontSize: '0.8rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4, padding: '10px 0 0', cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 4
            }}>
              <FileText size={14} /> Abrir Documento Original
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
            <Clock size={20} color={crisisColor} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Tempo de Resposta</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace', color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
                {elapsed}
              </span>
            </div>
          </div>
          <button onClick={onEndCrisis} style={{
            padding: '8px 24px', background: 'transparent', border: `1px solid ${crisisColor}`,
            color: crisisColor, borderRadius: 30, fontSize: '0.75rem', fontWeight: 800,
            cursor: 'pointer', transition: 'all 0.2s', letterSpacing: 1
          }} onMouseEnter={e => { e.currentTarget.style.background = crisisColor; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = crisisColor }}>
            ENCERRAR INCIDENTE
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Col 1: Checklist & Spokespersons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Action Checklist */}
          <div style={{ background: cardGradient, border: '1px solid rgba(255,255,255,0.1)', borderRadius: theme.radius.lg, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
              <CheckCircle2 size={18} color={crisisColor} /> Ações Imediatas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {checklist.length === 0 && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Sem checklist.</span>}
              {checklist.map(item => {
                const checked = checkedSteps[item.order]
                return (
                  <label key={item.order} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', background: checked ? 'rgba(0,255,100,0.05)' : 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 8, border: checked ? '1px solid rgba(0,255,100,0.2)' : '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                    <input type="checkbox" checked={checked || false} onChange={() => onToggleStep(item.order)} style={{ marginTop: 2, accentColor: crisisColor, width: 16, height: 16 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: checked ? 'rgba(255,255,255,0.5)' : '#fff', textDecoration: checked ? 'line-through' : 'none' }}>{item.step}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Passo {item.order}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
          
          {/* Relevant Spokespersons */}
          <div style={{ background: cardGradient, border: '1px solid rgba(255,255,255,0.1)', borderRadius: theme.radius.lg, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>🎙️ Porta-vozes Recomendados</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {spokespersons.slice(0, 3).map((sp: any) => (
                <div key={sp.id} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>{sp.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sp.persons.map((person: string, idx: number) => (
                      <span key={idx} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>{person}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2: Generator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
          <div style={{ background: cardGradient, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: theme.radius.lg, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
              📝 Gerador de Resposta Rápida
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
              Gere a primeira nota oficial em segundos, baseada nas diretrizes do protocolo.
            </p>

            <form onSubmit={handleGenerateNote} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 6, display: 'block', color: 'rgba(255,255,255,0.8)' }}>Título (Opcional)</label>
                <input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder={`Ex: NOTA OFICIAL: ${protocolName}`}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 6, display: 'block', color: 'rgba(255,255,255,0.8)' }}>Fatos Ocorridos *</label>
                <textarea 
                  required
                  value={facts} 
                  onChange={e => setFacts(e.target.value)} 
                  placeholder="Descreva resumidamente o que aconteceu..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 6, display: 'block', color: 'rgba(255,255,255,0.8)' }}>Ações Imediatas da Novacap *</label>
                <textarea 
                  required
                  value={actions} 
                  onChange={e => setActions(e.target.value)} 
                  placeholder="O que já está sendo feito para resolver..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }}
                />
              </div>
              <button type="submit" disabled={generating} style={{
                padding: '12px', background: `linear-gradient(90deg, ${crisisColor} 0%, #a00000 100%)`, color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 800, cursor: generating ? 'wait' : 'pointer',
                opacity: generating ? 0.7 : 1, transition: 'all 0.2s', boxShadow: `0 4px 15px ${crisisColor}40`
              }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                {generating ? 'GERANDO NOTA...' : 'GERAR NOTA OFICIAL'}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>Resultado</h3>
              {noteResult && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: '0.7rem', color: copied ? '#00e676' : '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />} {copied ? 'COPIADO' : 'COPIAR'}
                  </button>
                  <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: '0.7rem', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    <Download size={12} /> BAIXAR
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ 
              flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: 8, padding: 16, overflowY: 'auto', minHeight: 150, whiteSpace: 'pre-wrap',
              fontSize: '0.85rem', color: noteResult ? '#fff' : 'rgba(255,255,255,0.3)', fontFamily: noteResult ? 'serif' : 'inherit',
              lineHeight: 1.6
            }}>
              {noteResult ? noteResult : 'Preencha os dados e clique em gerar para visualizar a nota.'}
            </div>
          </div>
        </div>

        {/* Col 3: AI Consult */}
        <div style={{ background: cardGradient, border: '1px solid rgba(255,255,255,0.1)', borderRadius: theme.radius.lg, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
            🤖 Assistente de Crise (IA)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
            Tire dúvidas em tempo real consultando o banco de dados oficial do plano.
          </p>
          <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: theme.radius.md, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)' }}>
            <ConsultChat onSelectDoc={onSelectDoc} />
          </div>
        </div>
      </div>
    </div>
  )
}
