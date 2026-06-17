import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'
import { Icons } from '../components/FlatIcons'

interface DayData {
  month: number; day: number; count: number; extracted: number;
  checked: boolean; completed_at: string | null; docs_analyzed: number;
}

interface MonthlyData {
  month: number; name: string; total: number; processed: number; density: number;
}

interface HeatmapData {
  year: number; months: MonthlyData[]; daily: DayData[];
  checkedDays: number; totalDaysWithDocs: number;
  totalDocuments: number; totalExtracted: number; progress: number;
  priorityMonths: string[]; topPriority: string; highLoadDays: number;
}

interface KpiData {
  totalDocuments: number; extracted: number; extractionRate: number;
  classified: number; classificationRate: number;
  daysChecked: number; totalDaysWithDocs: number; daysProgress: number;
  avgDocsPerDay: number; remaining: number;
  estimatedDaysToFinish: number; topPriorityMonth: string;
}

export function CalendarHeatmap() {
  const { theme } = useTheme()
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const btnStyle = { padding: '6px 14px', borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}`, background: theme.colors.bgElevated, color: theme.colors.text, cursor: 'pointer', fontSize: '0.8rem', fontFamily: theme.fonts.body, transition: theme.transitions.fast, display: 'flex', alignItems: 'center', gap: 6 } as const

  const [year, setYear] = useState(new Date().getFullYear())
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null)
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [year])

  const loadData = async () => {
    setLoading(true)
    try {
      const [h, k] = await Promise.all([
        api.calendar.heatmap(year),
        api.calendar.kpi(year),
      ])
      setHeatmap(h)
      setKpi(k)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = async (day: DayData) => {
    const dateStr = `${year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
    try {
      if (day.checked) {
        await api.calendar.uncheckDay(dateStr)
      } else {
        await api.calendar.checkDay(dateStr, day.count)
      }
      await loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const getDayColor = (count: number, max: number, checked: boolean): string => {
    if (checked) return theme.colors.success
    if (count === 0) return 'transparent'
    const intensity = max > 0 ? Math.min(count / max, 1) : 0
    if (intensity > 0.7) return theme.colors.danger
    if (intensity > 0.4) return theme.colors.warning
    if (intensity > 0.15) return theme.colors.info + '88'
    return theme.colors.info + '44'
  }

  const getMonthMax = (month: number): number => {
    if (!heatmap) return 1
    const days = heatmap.daily.filter(d => d.month === month)
    return Math.max(...days.map(d => d.count), 1)
  }

  const checkAllMonth = async (month: number) => {
    if (!heatmap) return
    try {
      await api.calendar.checkMonth(year, month)
      await loadData()
    } catch (e) { console.error(e) }
  }

  const uncheckAllMonth = async (month: number) => {
    if (!heatmap) return
    const days = heatmap.daily.filter(d => d.month === month && d.checked)
    for (const day of days) {
      const dateStr = `${year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
      try { await api.calendar.uncheckDay(dateStr) } catch (e) { console.error(e) }
    }
    await loadData()
  }

  const sortedMonths = heatmap
    ? [...heatmap.months].sort((a, b) => {
        if (expandedMonth) {
          if (a.month === expandedMonth) return -1
          if (b.month === expandedMonth) return 1
        }
        return b.total - a.total
      })
    : []

  if (loading) return <LoadingSkeleton />
  if (!heatmap) return <div style={{ padding: 40, textAlign: 'center', color: theme.colors.textMuted }}>Erro ao carregar dados</div>

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Activity size={20} /> Calendário de Demandas
          </h1>
          <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
            Prioridade: começar pelo <strong style={{ color: theme.colors.danger }}>{heatmap.topPriority}</strong> (mês mais carregado)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setYear(y => y - 1)} style={btnStyle}>◀ {year - 1}</button>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: theme.colors.text, minWidth: 60, textAlign: 'center' }}>{year}</span>
          <button onClick={() => setYear(y => y + 1)} style={btnStyle}>{year + 1} ▶</button>
        </div>
      </div>

      {kpi && <KpiPanel kpi={kpi} theme={theme} />}

      <div style={{ ...cardBase, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Icons.Target size={16} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: theme.colors.text }}>Ordem de Prioridade</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {heatmap.priorityMonths.map((m, i) => (
            <span key={m} style={{
              padding: '3px 10px', borderRadius: 12,
              background: i === 0 ? `${theme.colors.danger}22` : i === 1 ? `${theme.colors.warning}22` : `${theme.colors.info}22`,
              color: i === 0 ? theme.colors.danger : i === 1 ? theme.colors.warning : theme.colors.info,
              fontSize: '0.75rem', fontWeight: 600,
            }}>
              {i + 1}º {m} {heatmap.months.find(mo => mo.name === m)?.total ? `(${heatmap.months.find(mo => mo.name === m)!.total} docs)` : ''}
            </span>
          ))}
        </div>
      </div>

      <div style={{ ...cardBase, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: theme.colors.textSecondary, fontWeight: 600 }}>Guia de Cores:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 16, borderRadius: 3, background: 'transparent', border: `1px solid ${theme.colors.border}` }} /><span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>Sem docs</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 16, borderRadius: 3, background: theme.colors.info + '44' }} /><span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>Baixa</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 16, borderRadius: 3, background: theme.colors.info + '88' }} /><span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>Média</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 16, borderRadius: 3, background: theme.colors.warning }} /><span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>Alta</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 16, borderRadius: 3, background: theme.colors.danger }} /><span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>Crítica</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 16, borderRadius: 3, background: theme.colors.success }} /><span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>Concluído</span></div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '0.7rem', color: theme.colors.textMuted }}>
          <strong style={{ color: theme.colors.text }}>{heatmap.checkedDays}</strong> de <strong style={{ color: theme.colors.text }}>{heatmap.totalDaysWithDocs}</strong> dias concluídos ({heatmap.progress}%)
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sortedMonths.map((monthData) => {
          const days = heatmap.daily.filter(d => d.month === monthData.month)
          const maxCount = getMonthMax(monthData.month)
          const checkedDays = days.filter(d => d.checked).length
          const totalDaysWithDocs = days.filter(d => d.count > 0).length
          const monthProgress = totalDaysWithDocs > 0 ? Math.round((checkedDays / totalDaysWithDocs) * 100) : 0
          const isExpanded = expandedMonth === monthData.month

          return (
            <div key={monthData.month} style={{
              ...cardBase, padding: 16,
              borderLeft: `3px solid ${
                monthData.total === 0 ? theme.colors.border :
                monthProgress === 100 ? theme.colors.success :
                monthData.total > 50 ? theme.colors.danger :
                monthData.total > 20 ? theme.colors.warning :
                theme.colors.info
              }`,
              opacity: monthData.total === 0 ? 0.4 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedMonth(isExpanded ? null : monthData.month)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: monthData.total === 0 ? theme.colors.textMuted : theme.colors.text }}>
                    {monthData.name}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10,
                    background: monthData.total > 50 ? `${theme.colors.danger}22` : monthData.total > 20 ? `${theme.colors.warning}22` : `${theme.colors.info}22`,
                    color: monthData.total > 50 ? theme.colors.danger : monthData.total > 20 ? theme.colors.warning : theme.colors.info,
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>
                    {monthData.total} docs
                  </span>
                  {monthData.processed > 0 && (
                    <span style={{ fontSize: '0.7rem', color: theme.colors.success }}>
                      {monthData.processed} processados
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 100, height: 6, borderRadius: 3,
                    background: theme.colors.bgElevated, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${monthProgress}%`, height: '100%',
                      background: monthProgress === 100 ? theme.colors.success : theme.colors.accent,
                      borderRadius: 3, transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: theme.colors.textMuted, minWidth: 30, textAlign: 'right' }}>
                    {monthProgress}%
                  </span>
                  <span style={{ fontSize: '0.8rem', color: theme.colors.textMuted }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
                    marginBottom: 8,
                  }}>
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                      <div key={d} style={{ fontSize: '0.6rem', color: theme.colors.textMuted, textAlign: 'center', fontWeight: 600 }}>{d}</div>
                    ))}
                    {Array.from({ length: new Date(year, monthData.month - 1, 1).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {days.map((day) => {
                      const bgColor = getDayColor(day.count, maxCount, day.checked)
                      return (
                        <div key={`${day.month}-${day.day}`} style={{
                          aspectRatio: '1', borderRadius: theme.radius.sm,
                          background: bgColor,
                          border: day.checked ? `2px solid ${theme.colors.success}` : `1px solid ${theme.colors.borderLight}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          cursor: day.count > 0 ? 'pointer' : 'default',
                          transition: theme.transitions.fast, position: 'relative',
                          minHeight: 36,
                        }} onClick={() => day.count > 0 && toggleDay(day)}
                          title={`${day.day}/${monthData.month} - ${day.count} docs${day.checked ? ' ✓' : ''}`}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: day.checked || day.count > 3 ? '#fff' : theme.colors.text }}>
                            {day.day}
                          </span>
                          {day.count > 0 && (
                            <span style={{ fontSize: '0.5rem', color: day.checked || day.count > 3 ? '#fff' : theme.colors.textMuted }}>
                              {day.count}
                            </span>
                          )}
                          {day.checked && (
                            <span style={{ position: 'absolute', top: 1, right: 2, fontSize: '0.5rem' }}>✓</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {checkedDays < totalDaysWithDocs ? (
                      <button onClick={() => checkAllMonth(monthData.month)}
                        style={{ ...btnStyle, padding: '4px 10px', fontSize: '0.7rem', background: 'rgba(0,200,83,0.1)', borderColor: theme.colors.success + '44' }}>
                        ✅ Concluir mês
                      </button>
                    ) : (
                      <button onClick={() => uncheckAllMonth(monthData.month)}
                        style={{ ...btnStyle, padding: '4px 10px', fontSize: '0.7rem', background: 'rgba(255,23,68,0.05)' }}>
                        🔄 Reabrir mês
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KpiPanel({ kpi, theme }: { kpi: KpiData; theme: any }) {
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }

  const cards = [
    { label: 'Total Documentos', value: kpi.totalDocuments, color: theme.colors.info, icon: '📄' },
    { label: 'Extraídos', value: `${kpi.extractionRate}%`, sub: `${kpi.extracted} docs`, color: kpi.extractionRate > 70 ? theme.colors.success : theme.colors.warning, icon: '📝' },
    { label: 'Classificados', value: `${kpi.classificationRate}%`, sub: `${kpi.classified} docs`, color: kpi.classificationRate > 70 ? theme.colors.success : theme.colors.warning, icon: '🏷️' },
    { label: 'Dias Concluídos', value: `${kpi.daysProgress}%`, sub: `${kpi.daysChecked}/${kpi.totalDaysWithDocs}`, color: theme.colors.accent, icon: '✅' },
    { label: 'Média/Dia', value: kpi.avgDocsPerDay, sub: 'docs por dia', color: theme.colors.info, icon: '📊' },
    { label: 'Restantes', value: kpi.remaining, sub: `~${kpi.estimatedDaysToFinish} dias`, color: kpi.remaining > 100 ? theme.colors.danger : kpi.remaining > 20 ? theme.colors.warning : theme.colors.success, icon: '⏳' },
    { label: 'Prioridade', value: kpi.topPriorityMonth, sub: 'mês mais carregado', color: theme.colors.danger, icon: '🎯', fullWidth: true },
  ]

  return (
    <div style={{ ...cardBase, padding: 16, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: theme.colors.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icons.Activity size={16} /> KPIs de Processamento
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: theme.radius.md,
            background: `${card.color}08`,
            border: `1px solid ${card.color}22`,
            gridColumn: card.fullWidth ? '1 / -1' : undefined,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: '1.2rem' }}>{card.icon}</span>
            <div>
              <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, marginBottom: 1 }}>{card.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: card.color }}>{card.value}</div>
              {card.sub && <div style={{ fontSize: '0.6rem', color: theme.colors.textMuted }}>{card.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  const { theme } = useTheme()
  return (
    <div>
      <div style={{ height: 28, width: 300, background: theme.colors.bgElevated, borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 16, width: 400, background: theme.colors.bgElevated, borderRadius: 4, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} style={{ height: 60, background: theme.colors.bgElevated, borderRadius: 8 }} />
        ))}
      </div>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 40, background: theme.colors.bgCard, borderRadius: theme.radius.md, marginBottom: 8, border: `1px solid ${theme.colors.border}` }} />
      ))}
    </div>
  )
}
