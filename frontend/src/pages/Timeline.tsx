import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'

import { API_BASE as API, api } from '../api'

interface TimelineDoc {
  id: number; name: string; extension: string; category: string
  summary: string; date: string; year: number; month: number
}

interface TimelineYear { year: number; count: number; documents: TimelineDoc[] }

interface TimelineData { timeline: TimelineDoc[]; years: TimelineYear[]; total: number; totalExtracted: number }

interface Props { onSelectDoc: (id: number) => void }

const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getIcon(ext: string | null | undefined): string {
  const icons: Record<string, string> = {
    '.pdf': '📄', '.doc': '📝', '.docx': '📝', '.xlsx': '📊', '.xls': '📊',
    '.jpg': '🖼️', '.png': '🖼️', '.webp': '🖼️', '.pptx': '📽️', '.txt': '📃',
  }
  return ext ? icons[ext] || '📎' : '📎'
}

const YEAR_COLORS = ['#7c4dff', '#00c853', '#ff9100', '#ff1744', '#00b8d4', '#aa00ff', '#ff6d00', '#00bfa5', '#d500f9', '#ff5722']

export function Timeline({ onSelectDoc }: Props) {
  const { theme } = useTheme()
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [calendarKpi, setCalendarKpi] = useState<any>(null)
  useEffect(() => { api.calendar.kpi().then(setCalendarKpi).catch(() => {}) }, [])

  useEffect(() => {
    fetch(`${API}/api/timeline`).then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton />
  if (!data || !data.timeline || !data.years) return <div style={{ textAlign: 'center', padding: 60, color: theme.colors.textMuted }}>Nenhum dado de timeline disponível</div>

  const filteredDocs = (data.timeline || []).filter(d => {
    if (selectedYear && d.year !== selectedYear) return false
    if (selectedMonth && d.month !== selectedMonth) return false
    return true
  })

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
          Linha do Tempo
        </h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          {data.total} documentos organizados cronologicamente · {data.totalExtracted} com conteúdo extraído
            · 📅 {calendarKpi?.daysChecked || 0} dias processados
        </p>
      </div>

      {/* Year pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {selectedYear && (
          <button onClick={() => { setSelectedYear(null); setSelectedMonth(null) }} style={pillStyle(true, theme.colors.danger, theme)}>
            ✕ Limpar
          </button>
        )}
        {(data.years || []).map((y, i) => (
          <button
            key={y.year}
            onClick={() => setSelectedYear(selectedYear === y.year ? null : y.year)}
            style={{
              ...pillStyle(selectedYear === y.year, YEAR_COLORS[i % YEAR_COLORS.length]!, theme),
              position: 'relative' as const,
            }}
          >
            {y.year}
            <span style={{
              position: 'absolute', top: -6, right: -6, width: 20, height: 20,
              borderRadius: 10, background: YEAR_COLORS[i % YEAR_COLORS.length]!,
              color: '#fff', fontSize: '0.55rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 10px ${YEAR_COLORS[i % YEAR_COLORS.length]!}50`,
            }}>{y.count}</span>
          </button>
        ))}
      </div>

      {/* Month selector */}
      {selectedYear && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
          {MONTHS.filter(Boolean).map((m, i) => {
            const hasDocs = data.timeline.some(d => d.year === selectedYear && d.month === i + 1)
            return (
              <button
                key={i + 1}
                onClick={() => setSelectedMonth(selectedMonth === i + 1 ? null : i + 1)}
                style={{
                  ...pillStyle(selectedMonth === i + 1, theme.colors.info, theme),
                  opacity: hasDocs ? 1 : 0.3,
                  cursor: hasDocs ? 'pointer' : 'default',
                }}
                disabled={!hasDocs}
              >
                {m}
              </button>
            )
          })}
        </div>
      )}

      {/* Timeline */}
      <div style={{ position: 'relative', marginBottom: 24, paddingLeft: 12 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 24, top: 0, bottom: 0,
          width: 2, background: `linear-gradient(to bottom, ${theme.colors.accent}, ${theme.colors.border})`,
          opacity: 0.3,
        }} />

        {filteredDocs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: theme.colors.textMuted }}>
            Nenhum documento neste período
          </div>
        )}

        {filteredDocs.slice(0, 50).map((doc, i) => {
          const color = YEAR_COLORS[i % YEAR_COLORS.length] || '#7c4dff'
          return (
            <div
              key={doc.id}
              onClick={() => onSelectDoc(doc.id)}
              style={{
                display: 'flex', gap: 16, marginBottom: 10, cursor: 'pointer',
                padding: '6px 0', opacity: 0,
                animation: `fadeIn 0.3s ease-out ${i * 0.03}s forwards`,
              }}
            >
              {/* Circle */}
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: color, flexShrink: 0, marginTop: 8, zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                boxShadow: `0 0 12px ${color}40`,
                border: `2px solid ${theme.colors.bg}`,
              }}>
                {i + 1}
              </div>

              {/* Card */}
              <div style={{
                flex: 1,
                background: theme.colors.bgCard,
                borderRadius: theme.radius.md,
                padding: '10px 14px',
                border: `1px solid ${theme.colors.border}`,
                transition: theme.transitions.fast,
                minWidth: 0,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color + '40'; e.currentTarget.style.boxShadow = `0 0 20px ${color}15` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{getIcon(doc.extension)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>
                      {doc.name || 'Documento sem nome'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: theme.colors.textMuted }}>
                      {doc.category || 'Outros'} · <span style={{ color: color }}>{doc.date || 'Sem data'}</span>
                    </p>
                  </div>
                </div>
                {doc.summary && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: theme.colors.textSecondary, lineHeight: 1.4 }}>
                    {doc.summary.substring(0, 120)}{doc.summary.length > 120 ? '...' : ''}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredDocs.length > 50 && (
        <p style={{ textAlign: 'center', color: theme.colors.textMuted, fontSize: '0.8rem' }}>
          Mostrando 50 de {filteredDocs.length} documentos
        </p>
      )}
    </div>
  )
}

function pillStyle(active: boolean, color: string, t: any): React.CSSProperties {
  return {
    border: active ? `2px solid ${color}` : `1px solid ${t.colors.border}`,
    background: active ? `${color}15` : t.colors.bgElevated,
    padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
    fontSize: '0.78rem', fontWeight: active ? 600 : 400,
    color: active ? color : t.colors.textSecondary,
    fontFamily: t.fonts.body, transition: t.transitions.fast,
  }
}

function LoadingSkeleton() {
  const { theme } = useTheme()
  return (
    <div>
      <div style={{ height: 28, width: 200, background: theme.colors.bgElevated, borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 16, width: 300, background: theme.colors.bgElevated, borderRadius: 4, marginBottom: 20 }} />
      {[1,2,3,4].map(i => (
        <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: theme.colors.bgElevated }} />
          <div style={{ flex: 1, height: 60, background: theme.colors.bgCard, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}` }} />
        </div>
      ))}
    </div>
  )
}
