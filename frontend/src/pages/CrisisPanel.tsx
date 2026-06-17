import { useState, useCallback, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
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

const crisisColor = 'oklch(58% 0.19 30)'

export function CrisisPanel({ onSelectDoc }: Props) {
  const { theme } = useTheme()
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
      // Opcional: Limpar checklist ao encerrar para estar pronto para a próxima
      saveProgress.mutate({})
    }
  }

  if (activeCrisis) {
    return (
      <div style={{ 
        margin: '-20px', 
        padding: '20px', 
        minHeight: 'calc(100vh - 60px)', 
        background: 'radial-gradient(circle at top, #2b0b0b 0%, var(--bg-default) 100%)',
        position: 'relative'
      }}>
        {/* Animated grid overlay for command center feel */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255, 60, 60, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 60, 60, 0.5) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
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
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
        borderRadius: theme.radius.lg,
        border: '1px solid var(--border-subtle)',
        padding: '30px 40px',
        marginBottom: 30,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: theme.shadows.md,
        position: 'relative'
      }}>
        {/* Decoration */}
        <div style={{ position: 'absolute', right: -50, top: -50, width: 250, height: 250, background: `${crisisColor}15`, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Shield size={28} style={{ color: crisisColor }} />
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Centro de Prontidão
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: 500, lineHeight: 1.5 }}>
            Monitore a saúde dos protocolos de crise, os porta-vozes designados e o checklist de resposta rápida. Em caso de evento adverso, declare o incidente abaixo.
          </p>
        </div>
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <button onClick={() => setShowSelector(!showSelector)}
            style={{
              padding: '16px 32px',
              background: `linear-gradient(135deg, ${crisisColor} 0%, #a01010 100%)`,
              border: 'none',
              borderRadius: 30,
              color: '#fff',
              cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem',
              letterSpacing: '1px',
              fontFamily: 'inherit', transition: 'all 0.3s',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 8px 25px ${crisisColor}40`,
              transform: showSelector ? 'scale(0.98)' : 'scale(1)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
          >
            <AlertTriangle size={18} fill="#fff" color={crisisColor} />
            DECLARAR INCIDENTE
          </button>
          
          {showSelector && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: theme.radius.lg, padding: 20, width: 380,
              boxShadow: theme.shadows.lg, zIndex: 10,
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>Selecione o Protocolo Afetado</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {protocols.length === 0 && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum protocolo cadastrado.</span>}
                {protocols.map((p: any) => (
                  <button key={p.id} onClick={() => startCrisis(p.id)} style={{
                    padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: theme.radius.md, color: 'var(--text-primary)', fontSize: '0.85rem',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', gap: 4
                  }} onMouseEnter={e => { e.currentTarget.style.borderColor = crisisColor; e.currentTarget.style.background = `${crisisColor}08` }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}>
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                    {p.summary && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.summary}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 20, marginBottom: 30 }}>
        {/* Score Card */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Índice de Prontidão</div>
          
          <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
              <circle cx="60" cy="60" r="54" fill="none" 
                stroke={readiness.score >= 80 ? 'var(--color-success)' : readiness.score >= 40 ? 'var(--color-warning)' : crisisColor} 
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - readiness.score / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }} 
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {readiness.score}%
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 16, marginTop: 24, width: '100%', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={20} style={{ color: readiness.hasProtocols ? 'var(--color-success)' : 'var(--border-subtle)', margin: '0 auto 4px' }} />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>PROTOCOLOS</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Users size={20} style={{ color: readiness.hasSpokespersons ? 'var(--color-success)' : 'var(--border-subtle)', margin: '0 auto 4px' }} />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>PORTA-VOZES</div>
            </div>
          </div>
        </div>

        {/* Protocols Grid */}
        <div style={{ height: '100%' }}>
          <CrisisProtocols protocols={protocols} crisisMode={false} onSelectDoc={onSelectDoc} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <CrisisChecklist checklist={checklist} checkedSteps={checkedSteps} crisisMode={false} onToggle={handleToggleStep} />
        <CrisisSpokespersons spokespersons={spokespersons} />
      </div>
    </div>
  )
}
