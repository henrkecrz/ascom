import { useState, useCallback, useEffect } from 'react'
import { Shield, CheckCircle2, Users, AlertTriangle } from 'lucide-react'
import { CrisisProtocols } from '../components/CrisisProtocols'
import { CrisisSpokespersons } from '../components/CrisisSpokespersons'
import { CrisisChecklist } from '../components/CrisisChecklist'
import { CrisisActiveWorkspace } from '../components/CrisisActiveWorkspace'
import { useProtocols, useSpokespersons, useChecklist, useChecklistProgress, useSaveChecklistProgress } from '../hooks/useApi'

interface Props { onSelectDoc: (id: number) => void }

interface ActiveCrisis {
  protocolId: number
  protocolName: string
  protocolSummary: string
  startTime: number
  keywords?: string
}

export function CrisisPanel({ onSelectDoc }: Props) {
  const { data: protocolsData } = useProtocols()
  const { data: spokespersonsData } = useSpokespersons()
  const { data: checklistData } = useChecklist()
  const { data: progressData } = useChecklistProgress()
  const saveProgress = useSaveChecklistProgress()

  const [activeCrisis, setActiveCrisis] = useState<ActiveCrisis | null>(() => {
    try {
      const saved = localStorage.getItem('novacap_active_crisis')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => {
    if (activeCrisis) {
      localStorage.setItem('novacap_active_crisis', JSON.stringify(activeCrisis))
    } else {
      localStorage.removeItem('novacap_active_crisis')
    }
  }, [activeCrisis])

  const protocols = protocolsData?.protocols ?? []
  const spokespersons = spokespersonsData?.spokespersons ?? []
  const checklist = checklistData?.checklist ?? []
  const readiness = checklistData?.readiness ?? { hasProtocols: false, hasSpokespersons: false, score: 0 }
  const checkedSteps = progressData?.progress ?? {}

  const handleToggleStep = useCallback((order: number) => {
    const next = { ...checkedSteps, [order]: !checkedSteps[order] }
    saveProgress.mutate(next)
  }, [checkedSteps, saveProgress])

  const startCrisis = (protocolId: number) => {
    const protocol = protocols.find((p: any) => p.id === protocolId)
    if (!protocol) return
    setActiveCrisis({
      protocolId,
      protocolName: protocol.name,
      protocolSummary: protocol.summary,
      startTime: Date.now(),
      keywords: protocol.keywords
    })
    setShowSelector(false)
  }

  const endCrisis = () => {
    if (confirm('Tem certeza que deseja encerrar o incidente ativo?')) {
      setActiveCrisis(null)
      saveProgress.mutate({})
    }
  }

  if (activeCrisis) {
    return (
      <div style={{ 
        margin: '-20px', 
        padding: '20px', 
        minHeight: 'calc(100vh - 60px)', 
        background: '#050505',
        position: 'relative',
        color: '#fff'
      }}>
        {/* Animated grid overlay for command center feel */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255, 60, 60, 0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 60, 60, 0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <CrisisActiveWorkspace 
            protocolId={activeCrisis.protocolId}
            protocolName={activeCrisis.protocolName}
            protocolSummary={activeCrisis.protocolSummary}
            keywords={activeCrisis.keywords}
            startTime={activeCrisis.startTime}
            onEndCrisis={endCrisis}
            onSelectDoc={onSelectDoc}
            checklist={checklist}
            checkedSteps={checkedSteps}
            onToggleStep={handleToggleStep}
            spokespersons={spokespersons}
          />
        </div>
      </div>
    )
  }

  // STANDBY MODE
  return (
    <div style={{ 
      margin: '-20px', padding: '40px', minHeight: 'calc(100vh - 60px)', 
      background: '#0a0a0a', color: '#fff', position: 'relative', overflow: 'hidden' 
    }}>
      {/* Background Dot Matrix */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Hero Section */}
        <div style={{
          background: 'rgba(20, 20, 20, 0.8)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.05)',
          padding: '40px',
          marginBottom: 30,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Shield size={32} color="#4ade80" />
              <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1px' }}>
                Centro de Prontidão
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.6)', maxWidth: 600, lineHeight: 1.6 }}>
              Aguardando incidentes. Monitore a saúde dos protocolos de crise, os porta-vozes designados e o checklist de resposta rápida.
            </p>
          </div>
          
          <button onClick={() => setShowSelector(true)}
            style={{
              padding: '20px 40px',
              background: `linear-gradient(135deg, #ff2a2a 0%, #a00000 100%)`,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer', fontWeight: 900, fontSize: '1.1rem',
              letterSpacing: '2px', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: `0 0 30px rgba(255, 42, 42, 0.4)`,
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(255, 42, 42, 0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 42, 42, 0.4)'; }}
          >
            <AlertTriangle size={24} fill="#fff" color="#ff2a2a" />
            Declarar Incidente
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 24, marginBottom: 30 }}>
          {/* Score Card (Radar Style) */}
          <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(20, 20, 20, 0.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 24 }}>Índice de Prontidão</div>
            
            <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.1)', animation: 'spin 20s linear infinite' }} />
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <circle cx="80" cy="80" r="70" fill="none" 
                  stroke={readiness.score >= 80 ? '#4ade80' : readiness.score >= 40 ? '#fbbf24' : '#ff2a2a'} 
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - readiness.score / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} 
                />
              </svg>
              <div style={{ position: 'absolute', fontSize: '3rem', fontWeight: 900, color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                {readiness.score}%
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 24, marginTop: 30, width: '100%', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 8, minWidth: 100 }}>
                <CheckCircle2 size={24} style={{ color: readiness.hasProtocols ? '#4ade80' : 'rgba(255,255,255,0.2)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 1 }}>PROTOCOLOS</div>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 8, minWidth: 100 }}>
                <Users size={24} style={{ color: readiness.hasSpokespersons ? '#4ade80' : 'rgba(255,255,255,0.2)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 1 }}>PORTA-VOZES</div>
              </div>
            </div>
          </div>

          {/* Protocols Grid */}
          <div style={{ background: 'rgba(20, 20, 20, 0.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', padding: 24 }}>
            <CrisisProtocols protocols={protocols} crisisMode={false} onSelectDoc={onSelectDoc} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: 'rgba(20, 20, 20, 0.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', padding: 24 }}>
            <CrisisChecklist checklist={checklist} checkedSteps={checkedSteps} crisisMode={false} onToggle={handleToggleStep} />
          </div>
          <div style={{ background: 'rgba(20, 20, 20, 0.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', padding: 24 }}>
            <CrisisSpokespersons spokespersons={spokespersons} />
          </div>
        </div>
      </div>

      {/* FULL-SCREEN IMMERSIVE MODAL FOR PROTOCOL SELECTION */}
      {showSelector && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(30,0,0,0.9) 0%, rgba(10,0,0,1) 100%)',
            border: '1px solid #ff2a2a', borderRadius: 16,
            padding: 40, width: '100%', maxWidth: 600,
            boxShadow: '0 0 100px rgba(255,42,42,0.2)',
            display: 'flex', flexDirection: 'column', gap: 20,
            transform: 'scale(1)', animation: 'zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,42,42,0.3)', paddingBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={32} color="#ff2a2a" />
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Selecione o Protocolo Afetado
                </h2>
              </div>
              <button onClick={() => setShowSelector(false)} style={{
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '2rem', cursor: 'pointer', lineHeight: 1
              }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '50vh', overflowY: 'auto', paddingRight: 8 }}>
              {protocols.length === 0 && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40 }}>Nenhum protocolo de crise encontrado na base de dados.</div>}
              {protocols.map((p: any) => (
                <button key={p.id} onClick={() => startCrisis(p.id)} style={{
                  padding: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, color: '#fff', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', gap: 8
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff2a2a'; e.currentTarget.style.background = 'rgba(255,42,42,0.1)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{p.name}</span>
                  {p.summary && <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{p.summary}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
