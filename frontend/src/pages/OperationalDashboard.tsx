import { useState, useCallback } from 'react'
import {
  AlertTriangle, ScrollText, Calendar, Users, Search,
  TrendingUp, Activity, FileText, MessageSquare, Bell,
} from 'lucide-react'
import { KpiCard } from '../components/KpiCard'
import { SectionCard } from '../components/SectionCard'
import { QuickActions } from '../components/QuickActions'
import { useAdvisorSummary, useCalendarKpi } from '../hooks/useApi'

const RECENT_SEARCHES_KEY = 'pc_recent_searches'

interface Props { onSelectDoc?: (id: number) => void; onNavigate: (page: string) => void }

const accent = 'oklch(58% 0.16 255)'
const crisis = 'oklch(58% 0.19 30)'

const sectionCards = [
  { key: 'crisis', icon: AlertTriangle, label: 'Crises', desc: 'Protocolos de emergência e acionamento', color: crisis, bg: `${crisis}12`, page: 'crisis' },
  { key: 'consult', icon: MessageSquare, label: 'Consulta', desc: 'IA sobre o plano de comunicação', color: accent, bg: `${accent}12`, page: 'consult' },
  { key: 'search', icon: Search, label: 'Busca', desc: 'Pesquisa semântica no acervo', color: 'oklch(58% 0.14 280)', bg: 'oklch(58% 0.14 280 / 0.12)', page: 'search' },
  { key: 'calendar', icon: Calendar, label: 'Calendário', desc: 'Demandas e eventos do plano', color: 'oklch(58% 0.15 145)', bg: 'oklch(58% 0.15 145 / 0.12)', page: 'calendar' },
  { key: 'reports', icon: TrendingUp, label: 'Relatórios', desc: 'Métricas e indicadores', color: 'oklch(58% 0.16 50)', bg: 'oklch(58% 0.16 50 / 0.12)', page: 'reports' },
  { key: 'timeline', icon: Activity, label: 'Timeline', desc: 'Histórico de ações', color: 'oklch(58% 0.14 330)', bg: 'oklch(58% 0.14 330 / 0.12)', page: 'timeline' },
]

const quickActions = [
  { label: 'Nova consulta', icon: MessageSquare, page: 'consult' },
  { label: 'Simular crise', icon: AlertTriangle, page: 'simulator' },
  { label: 'Gerar release', icon: ScrollText, page: 'generator' },
  { label: 'Ver saúde', icon: Activity, page: 'health' },
]

export function OperationalDashboard({ onSelectDoc: _onSelectDoc, onNavigate }: Props) {
  const { data: summary } = useAdvisorSummary()
  const { data: kpi } = useCalendarKpi()
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const saveRecentSearch = (query: string) => {
    if (!query) return
    setRecentSearches(prev => {
      const next = [query, ...prev.filter(q => q !== query)].slice(0, 5)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleSearch = useCallback((queryToUse?: string) => {
    const q = queryToUse !== undefined ? queryToUse : searchQuery
    if (q.trim()) {
      saveRecentSearch(q.trim())
      window.location.hash = `/search?q=${encodeURIComponent(q.trim())}`
    }
  }, [searchQuery])

  const t = {
    primary: 'var(--bg-primary)',
    card: 'var(--bg-surface)',
    elevated: 'var(--bg-elevated)',
    text: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textMuted: 'var(--text-muted)',
    border: 'var(--border-subtle)',
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Centro de Comando
        </h1>
        <p style={{ margin: '4px 0 16px', fontSize: '0.82rem', color: t.textSecondary }}>
          Visão geral do Plano de Comunicação — Novacap ASCOM
        </p>
        <div className="flex gap-xs">
          <div className="flex items-center" style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0 12px', maxWidth: 400, position: 'relative' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar documentos, protocolos..."
              className="premium-input"
              style={{ flex: 1, border: 'none', padding: '10px 8px', boxShadow: 'none', background: 'transparent' }}
            />
          </div>
          <button onClick={() => handleSearch()}
            className="btn btn--primary btn--sm"
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}>
            Buscar
          </button>
        </div>
        {recentSearches.length > 0 && !searchQuery && (
          <div className="flex gap-xs flex-wrap animate-fade-in-up" style={{ marginTop: 12 }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: 4 }}>Recentes:</span>
            {recentSearches.map(q => (
              <button key={q} onClick={() => handleSearch(q)}
                style={{
                  padding: '2px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  borderRadius: 12, fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
        <KpiCard label="Documentos" value={String(kpi?.totalDocuments ?? summary?.totalFiles ?? '—')} icon={FileText} color={accent} />
        <KpiCard label="Extraídos" value={`${kpi?.extractionRate ?? summary?.completionRate ?? 0}%`} icon={Activity} color="oklch(58% 0.15 145)" />
        <KpiCard label="Prioridade" value={kpi?.topPriorityMonth ?? summary?.topPriorityMonth ?? '—'} icon={Calendar} color="oklch(68% 0.14 85)" />
        <KpiCard label="Restantes" value={String(kpi?.remaining ?? summary?.remaining ?? '—')} icon={AlertTriangle} color={crisis} />
        <KpiCard label="Saúde" value={`${summary?.healthScore ?? kpi?.daysProgress ?? 0}%`} icon={TrendingUp} color={(summary?.healthScore ?? 0) >= 70 ? 'oklch(58% 0.15 145)' : 'oklch(68% 0.14 85)'} />
      </div>

      <h2 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 600, color: t.textSecondary }}>Módulos</h2>
      <div className="grid-modules" style={{ marginBottom: 24 }}>
        {sectionCards.map(s => (
          <SectionCard key={s.key} label={s.label} desc={s.desc} color={s.color} bg={s.bg} page={s.page} icon={s.icon} onNavigate={onNavigate} />
        ))}
      </div>

      {summary && !summary.hasProtocols && (
        <div style={{ background: `${crisis}0f`, border: `1px solid ${crisis}30`, borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} style={{ color: crisis, flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', color: t.textSecondary, flex: 1 }}>Nenhum protocolo de crise cadastrado. <span style={{ color: t.textMuted }}>Configure no painel de crise.</span></span>
          <button onClick={() => onNavigate('crisis')} style={{
            padding: '6px 12px', background: crisis, border: 'none', borderRadius: 'var(--radius-sm)',
            color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            Ir para Crise
          </button>
        </div>
      )}

      <QuickActions actions={quickActions} onNavigate={onNavigate} />

      <div className="grid-cols-2" style={{ gap: 12, display: 'grid' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div className="flex items-center gap-xs" style={{ marginBottom: 10 }}>
            <Bell size={14} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Alertas</h3>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{kpi?.remaining > 0 ? `${kpi.remaining} demandas pendentes no calendário` : 'Nenhum alerta no momento'}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div className="flex items-center gap-xs" style={{ marginBottom: 10 }}>
            <Users size={14} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Equipe</h3>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Porta-vozes e responsáveis mapeados no plano</div>
        </div>
      </div>
    </div>
  )
}
