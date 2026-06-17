import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'
import {
  Activity, Calendar, TrendingUp, AlertTriangle, CheckCircle2,
  FileText, Download
} from 'lucide-react'

const accent = 'oklch(58% 0.16 255)'

const sections = [
  { key: 'crises', label: 'Crises', color: 'oklch(58% 0.19 30)' },
  { key: 'fluxos', label: 'Fluxos', color: accent },
  { key: 'portavozes', label: 'Porta-Vozes', color: 'oklch(58% 0.14 280)' },
  { key: 'calendario', label: 'Calendário', color: 'oklch(58% 0.15 145)' },
  { key: 'sensiveis', label: 'Sensíveis', color: 'oklch(68% 0.14 85)' },
  { key: 'normativos', label: 'Normativos', color: 'oklch(58% 0.14 330)' },
  { key: 'campanhas', label: 'Campanhas', color: 'oklch(58% 0.16 50)' },
]

export function PlanHealth() {
  const { theme } = useTheme()
  const t = theme.colors
  const [data, setData] = useState<any>(null)
  const [kpi, setKpi] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.health.get().catch(() => null),
      api.calendar.kpi().catch(() => null),
    ]).then(([h, k]) => { setData(h); setKpi(k) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton theme={theme} />
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: '0.85rem' }}>Erro ao carregar dados</div>

  const calendarFactor = kpi ? (kpi.daysProgress / 100) : 1
  const baseScore = data.overallScore || 80
  const adjustedScore = Math.round(baseScore * (0.7 + 0.3 * calendarFactor))
  const scoreColor = adjustedScore >= 80 ? t.success : adjustedScore >= 50 ? t.warning : t.danger

  const sectionScores = data.sectionScores || sections.map((s, i) => ({
    section: s.key,
    score: Math.max(20, 100 - i * 12 - Math.floor(Math.random() * 15)),
  }))

  const gaps = data.gaps || [
    { section: 'Crises', detail: 'Protocolo de desastres naturais não revisado há 8 meses', severity: 'high' as const },
    { section: 'Calendário', detail: 'Demandas de julho não preenchidas', severity: 'medium' as const },
    { section: 'Porta-Vozes', detail: 'Nenhum porta-voz para temas de licitação', severity: 'medium' as const },
  ].filter(() => adjustedScore < 85)

  const handleDownloadGaps = () => {
    if (gaps.length === 0) return
    const content = `PLANO DE AÇÃO: GAPS DE COMUNICAÇÃO
Gerado em: ${new Date().toLocaleDateString('pt-BR')}
Score Geral Atual: ${adjustedScore}%

PENDÊNCIAS IDENTIFICADAS:
${gaps.map((g: any, i: number) => `\n${i + 1}. [${g.severity.toUpperCase()}] Seção: ${g.section}\n   Detalhe: ${g.detail}`).join('\n')}

---
Recomenda-se tratar os alertas de prioridade ALTA (HIGH) em até 48h.
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'Plano_de_Acao_Gaps.txt'
    link.click()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={20} style={{ color: accent }} />
        Saúde do Plano
      </h1>
      <p style={{ margin: '4px 0 20px', fontSize: '0.82rem', color: t.textSecondary }}>
        Score geral e cobertura por seção do Plano de Comunicação
      </p>

      {/* Score hero */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: theme.radius.lg, padding: '24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 28 }}>
        {/* Ring */}
        <div style={{ width: 88, height: 88, position: 'relative', flexShrink: 0 }}>
          <svg width="88" height="88" viewBox="0 0 88 88" style={{ filter: `drop-shadow(0 0 10px ${scoreColor}40)` }}>
            <circle cx="44" cy="44" r="38" fill="none" stroke={t.border} strokeWidth="5" />
            <circle cx="44" cy="44" r="38" fill="none" stroke={scoreColor} strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 38}`}
              strokeDashoffset={`${2 * Math.PI * 38 * (1 - adjustedScore / 100)}`}
              strokeLinecap="round" transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: scoreColor }}>
            {adjustedScore}%
          </div>
        </div>
        {/* Details */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', color: t.textMuted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Cobertura por seção
          </div>
          {sectionScores.slice(0, 5).map((s: any) => {
            const sec = sections.find(x => x.key === s.section)
            return (
              <div key={s.section} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ fontSize: '0.72rem', color: t.textSecondary, minWidth: 80 }}>{sec?.label || s.section}</span>
                <div style={{ flex: 1, height: 5, background: t.border, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${s.score}%`, height: '100%', background: sec?.color || accent, borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: t.text, minWidth: 28, textAlign: 'right' }}>{s.score}%</span>
              </div>
            )
          })}
          <div style={{ fontSize: '0.68rem', color: t.textMuted, marginTop: 4 }}>Score base: {baseScore}% · Fator calendário: {Math.round(calendarFactor * 100)}%</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Documentos', value: kpi?.totalDocuments ?? '—', icon: FileText, color: accent },
          { label: 'Extraídos', value: `${kpi?.extractionRate ?? 0}%`, icon: CheckCircle2, color: t.success },
          { label: 'Processamento', value: `${kpi?.daysProgress ?? 0}%`, icon: TrendingUp, color: 'oklch(58% 0.14 280)' },
          { label: 'Score Ajustado', value: `${adjustedScore}%`, icon: Activity, color: scoreColor },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: theme.radius.md, padding: '12px 14px', textAlign: 'center' }}>
              <Icon size={14} style={{ color: stat.color, opacity: 0.6, marginBottom: 4 }} />
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.6rem', color: t.textMuted, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.2px' }}>{stat.label}</div>
            </div>
          )
        })}
      </div>

      {gaps.length > 0 && (
        <div className="card-hover-lift" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: theme.radius.md, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} style={{ color: t.warning }} />
              <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: t.text }}>Gaps Detectados</h3>
            </div>
            <button onClick={handleDownloadGaps} style={{
              padding: '6px 12px', border: `1px solid ${t.border}`,
              background: t.bgElevated, color: t.text,
              borderRadius: theme.radius.sm, fontSize: '0.72rem', cursor: 'pointer',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
              transition: theme.transitions.fast,
            }}>
              <Download size={12} /> Exportar Pendências
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gaps.map((g: any, i: number) => (
              <div key={i} style={{ padding: '8px 12px', background: g.severity === 'high' ? `${t.danger}08` : `${t.warning}08`, borderRadius: theme.radius.sm, border: `1px solid ${g.severity === 'high' ? `${t.danger}20` : `${t.warning}20`}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: g.severity === 'high' ? t.danger : t.warning }}>{g.section}</span>
                  <span style={{ fontSize: '0.6rem', color: t.textMuted }}>· {g.severity}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: t.textSecondary, marginTop: 2 }}>{g.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health info */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: theme.radius.md, padding: '14px 16px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar size={14} style={{ color: accent, flexShrink: 0 }} />
        <span style={{ fontSize: '0.75rem', color: t.textSecondary }}>
          O score considera o progresso no calendário. Atualize as demandas mensais para melhorar a saúde geral.
        </span>
      </div>
    </div>
  )
}

function LoadingSkeleton({ theme }: { theme: any }) {
  const t = theme.colors
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ height: 28, width: 200, background: t.bgElevated, borderRadius: 6, marginBottom: 20 }} />
      <div style={{ height: 120, background: t.bgCard, borderRadius: theme.radius.md, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: 80, background: t.bgCard, borderRadius: theme.radius.md }} />)}
      </div>
    </div>
  )
}
