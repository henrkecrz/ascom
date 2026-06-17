import { useState, useCallback, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { Shield, CheckCircle2, Users } from 'lucide-react'
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
      startTime: Date.now()
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
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <CrisisActiveWorkspace 
          protocolId={activeCrisis.protocolId}
          protocolName={activeCrisis.protocolName}
          protocolSummary={activeCrisis.protocolSummary}
          startTime={activeCrisis.startTime}
          onEndCrisis={endCrisis}
          onSelectDoc={onSelectDoc}
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <CrisisChecklist checklist={checklist} checkedSteps={checkedSteps} crisisMode={true} onToggle={handleToggleStep} />
          <CrisisSpokespersons spokespersons={spokespersons} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center" style={{ marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Prontidão de Crise
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Protocolos, porta-vozes e painel de declaração de incidentes
          </p>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowSelector(!showSelector)}
            style={{
              padding: '10px 20px',
              background: crisisColor,
              border: 'none',
              borderRadius: theme.radius.sm,
              color: '#fff',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
              fontFamily: 'inherit', transition: 'all 0.3s',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              boxShadow: theme.shadows.glow
            }}>
            <Shield size={14} />
            DECLARAR INCIDENTE
          </button>
          
          {showSelector && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: theme.radius.md, padding: 16, width: 300,
              boxShadow: theme.shadows.lg, zIndex: 10
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700 }}>Selecione o Protocolo Afetado</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {protocols.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nenhum protocolo disponível.</span>}
                {protocols.map((p: any) => (
                  <button key={p.id} onClick={() => startCrisis(p.id)} style={{
                    padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: theme.radius.sm, color: 'var(--text-primary)', fontSize: '0.75rem',
                    textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.2s'
                  }} onMouseEnter={e => e.currentTarget.style.borderColor = crisisColor} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>PRONTIDÃO</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: readiness.score >= 80 ? 'var(--color-success)' : readiness.score >= 40 ? 'var(--color-warning)' : crisisColor }}>{readiness.score}%</div>
          <div style={{ width: 80, height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden', margin: '4px auto 0' }}>
            <div style={{ width: `${readiness.score}%`, height: '100%', background: readiness.score >= 80 ? 'var(--color-success)' : readiness.score >= 40 ? 'var(--color-warning)' : crisisColor, borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
        </div>
        <div className="flex" style={{ gap: 16, fontSize: '0.72rem' }}>
          <div className="flex items-center gap-xs" style={{ color: readiness.hasProtocols ? 'var(--color-success)' : 'var(--text-muted)' }}>
            <CheckCircle2 size={12} /> Protocolos
          </div>
          <div className="flex items-center gap-xs" style={{ color: readiness.hasSpokespersons ? 'var(--color-success)' : 'var(--text-muted)' }}>
            <Users size={12} /> Porta-vozes
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
        <CrisisProtocols protocols={protocols} crisisMode={false} onSelectDoc={onSelectDoc} />

        <div className="flex flex-col" style={{ gap: 16 }}>
          <CrisisSpokespersons spokespersons={spokespersons} />
          <CrisisChecklist checklist={checklist} checkedSteps={checkedSteps} crisisMode={false} onToggle={handleToggleStep} />
        </div>
      </div>
    </div>
  )
}
