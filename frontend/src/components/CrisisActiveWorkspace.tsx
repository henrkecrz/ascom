import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { AlertTriangle, Clock, FileText, CheckCircle2, Copy, Download, Radio, ShieldAlert } from 'lucide-react'
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

  const [elapsed, setElapsed] = useState<string>('00:00:00')
  const [title, setTitle] = useState('')
  const [facts, setFacts] = useState('')
  const [actions, setActions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [noteResult, setNoteResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'generator' | 'ai'>('ai')

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, padding: '10px 20px', color: '#fff' }}>
      {/* Top HUD Alert Bar */}
      <div style={{ 
        background: 'rgba(15, 0, 0, 0.8)',
        border: `1px solid ${crisisColor}`,
        borderRadius: 16,
        padding: '24px 32px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: `0 0 50px rgba(255, 42, 42, 0.15), inset 0 0 20px rgba(255, 42, 42, 0.2)`,
        backdropFilter: 'blur(20px)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Pulsing glow background */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${crisisColor}, transparent)`, animation: 'scan 2s ease-in-out infinite' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, zIndex: 1 }}>
          <div style={{ 
            background: `linear-gradient(135deg, ${crisisColor} 0%, #a00000 100%)`,
            color: '#fff', padding: 20, borderRadius: '50%',
            boxShadow: `0 0 40px ${crisisColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulseHeartbeat 1.5s infinite'
          }}>
            <ShieldAlert size={36} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: crisisColor, textTransform: 'uppercase', letterSpacing: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: crisisColor, boxShadow: `0 0 10px ${crisisColor}` }} />
                PROTOCOLO DE CRISE ATIVADO
              </div>
              {keywords && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {keywords.split(',').filter(Boolean).slice(0, 3).map((kw, i) => (
                    <span key={i} style={{ background: 'rgba(255,42,42,0.1)', padding: '2px 10px', borderRadius: 4, fontSize: '0.7rem', border: '1px solid rgba(255,42,42,0.3)', color: '#ff8a8a', fontWeight: 800, textTransform: 'uppercase' }}>{kw}</span>
                  ))}
                </div>
              )}
            </div>
            <h2 style={{ margin: '8px 0 6px', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1px', textShadow: '0 2px 20px rgba(255,42,42,0.5)' }}>
              {protocolName}
            </h2>
            {protocolSummary && (
              <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.7)', maxWidth: 800, lineHeight: 1.5 }}>
                {protocolSummary}
              </p>
            )}
            <button onClick={() => onSelectDoc(protocolId)} style={{ 
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.8rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', cursor: 'pointer', borderRadius: 6, marginTop: 12,
              transition: 'all 0.2s'
            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}>
              <FileText size={16} /> Visualizar Documento Original
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16, zIndex: 1 }}>
          <div style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid rgba(255,42,42,0.4)`, padding: '16px 32px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'inset 0 0 20px rgba(255,42,42,0.2)' }}>
            <Clock size={28} color={crisisColor} style={{ animation: 'spinClock 4s linear infinite' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: '#ff8a8a', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 800 }}>Tempo de Resposta</span>
              <span style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: '"Courier New", Courier, monospace', color: '#fff', letterSpacing: 4, lineHeight: 1, textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
                {elapsed}
              </span>
            </div>
          </div>
          <button onClick={onEndCrisis} style={{
            padding: '12px 32px', background: 'transparent', border: `2px solid ${crisisColor}`,
            color: crisisColor, borderRadius: 8, fontSize: '0.9rem', fontWeight: 900,
            cursor: 'pointer', transition: 'all 0.2s', letterSpacing: 2, textTransform: 'uppercase'
          }} onMouseEnter={e => { e.currentTarget.style.background = crisisColor; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = `0 0 20px ${crisisColor}`; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = crisisColor; e.currentTarget.style.boxShadow = 'none'; }}>
            Encerrar Incidente
          </button>
        </div>
      </div>

      {/* Main Content Grid - 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 30, alignItems: 'start' }}>
        
        {/* Left Column: Actions & People */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {/* Action Checklist */}
          <div style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
              <CheckCircle2 size={20} color={crisisColor} /> Ações Imediatas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {checklist.length === 0 && <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Sem checklist estruturado.</span>}
              {checklist.map(item => {
                const checked = checkedSteps[item.order]
                return (
                  <label key={item.order} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, cursor: 'pointer', background: checked ? 'rgba(74, 222, 128, 0.05)' : 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: 8, border: checked ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }} onMouseEnter={e => { if(!checked) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }} onMouseLeave={e => { if(!checked) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)' }}>
                    <input type="checkbox" checked={checked || false} onChange={() => onToggleStep(item.order)} style={{ marginTop: 4, width: 18, height: 18, accentColor: '#4ade80' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: checked ? 'rgba(255,255,255,0.4)' : '#fff', textDecoration: checked ? 'line-through' : 'none' }}>{item.step}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 6, fontWeight: 800, letterSpacing: 1 }}>PASSO {item.order}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
          
          {/* Spokespersons */}
          <div style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              🎙️ Porta-Vozes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {spokespersons.slice(0, 3).map((sp: any) => (
                <div key={sp.id} style={{ padding: 16, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: 10 }}>{sp.name}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {sp.persons.map((person: string, idx: number) => (
                      <span key={idx} style={{ fontSize: '0.75rem', color: '#ff8a8a', background: 'rgba(255,42,42,0.1)', border: '1px solid rgba(255,42,42,0.2)', padding: '4px 10px', borderRadius: 4, fontWeight: 700 }}>{person}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI / Generator Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setActiveTab('ai')} style={{
              flex: 1, padding: '20px', background: activeTab === 'ai' ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none', borderBottom: activeTab === 'ai' ? `2px solid ${crisisColor}` : '2px solid transparent',
              color: activeTab === 'ai' ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: '1rem',
              cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}>
              🤖 Assistente IA
            </button>
            <button onClick={() => setActiveTab('generator')} style={{
              flex: 1, padding: '20px', background: activeTab === 'generator' ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none', borderBottom: activeTab === 'generator' ? `2px solid ${crisisColor}` : '2px solid transparent',
              color: activeTab === 'generator' ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: '1rem',
              cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}>
              📝 Gerador de Notas
            </button>
          </div>

          <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {activeTab === 'ai' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
                  Consulte a base de dados do plano em tempo real para tirar dúvidas rápidas sobre como agir.
                </p>
                <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  <ConsultChat onSelectDoc={onSelectDoc} />
                </div>
              </div>
            )}

            {activeTab === 'generator' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
                  Gere a primeira resposta oficial em segundos, alinhada às diretrizes da Novacap.
                </p>

                <form onSubmit={handleGenerateNote} style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: 8, display: 'block', color: 'rgba(255,255,255,0.8)' }}>Título (Opcional)</label>
                    <input 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      placeholder={`Ex: NOTA OFICIAL: ${protocolName}`}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.5)', color: '#fff', boxSizing: 'border-box', outline: 'none', fontSize: '1rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: 8, display: 'block', color: 'rgba(255,255,255,0.8)' }}>Fatos Ocorridos *</label>
                    <textarea 
                      required
                      value={facts} 
                      onChange={e => setFacts(e.target.value)} 
                      placeholder="Descreva o que aconteceu em detalhes..."
                      rows={4}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.5)', color: '#fff', boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontSize: '1rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: 8, display: 'block', color: 'rgba(255,255,255,0.8)' }}>Ações Imediatas *</label>
                    <textarea 
                      required
                      value={actions} 
                      onChange={e => setActions(e.target.value)} 
                      placeholder="O que está sendo feito para controlar a situação..."
                      rows={4}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.5)', color: '#fff', boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontSize: '1rem' }}
                    />
                  </div>
                  <button type="submit" disabled={generating} style={{
                    padding: '16px', background: `linear-gradient(90deg, ${crisisColor} 0%, #a00000 100%)`, color: '#fff',
                    border: 'none', borderRadius: 8, fontWeight: 900, cursor: generating ? 'wait' : 'pointer', fontSize: '1.1rem',
                    opacity: generating ? 0.7 : 1, transition: 'all 0.2s', boxShadow: `0 10px 30px rgba(255,42,42,0.4)`
                  }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    {generating ? 'GERANDO NOTA OFICIAL...' : 'GERAR NOTA OFICIAL AGORA'}
                  </button>
                </form>

                {noteResult && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#4ade80' }}>Nota Gerada</h3>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: '0.8rem', color: copied ? '#4ade80' : '#fff', cursor: 'pointer', fontWeight: 800 }}>
                          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied ? 'COPIADO' : 'COPIAR'}
                        </button>
                        <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: '0.8rem', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
                          <Download size={14} /> BAIXAR
                        </button>
                      </div>
                    </div>
                    <div style={{ 
                      flex: 1, background: '#000', border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: 12, padding: 24, overflowY: 'auto', whiteSpace: 'pre-wrap',
                      fontSize: '0.95rem', color: '#fff', fontFamily: 'Georgia, serif',
                      lineHeight: 1.8
                    }}>
                      {noteResult}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes pulseHeartbeat {
          0% { transform: scale(1); box-shadow: 0 0 30px ${crisisColor}60; }
          15% { transform: scale(1.15); box-shadow: 0 0 60px ${crisisColor}; }
          30% { transform: scale(1); box-shadow: 0 0 30px ${crisisColor}60; }
          45% { transform: scale(1.15); box-shadow: 0 0 60px ${crisisColor}; }
          100% { transform: scale(1); box-shadow: 0 0 30px ${crisisColor}60; }
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spinClock {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
