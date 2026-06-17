import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'

import { API_BASE as API } from '../api'

interface ReportDoc {
  id: number; name: string; extension: string; size_formatted: string
  category: string; summary: string; keywords: string[]; word_count: number
}

interface ClusterReport {
  clusterId: number; clusterName: string; description: string; themeWords: string[]
  documents: ReportDoc[]; topKeywords: { word: string; count: number }[]
  stats: { total_documents: number; total_words: number; avg_words: number }
}

interface Props { onSelectDoc: (id: number) => void }

const COLORS = ['#7c4dff', '#00c853', '#ff9100', '#ff1744', '#00b8d4', '#aa00ff', '#ff6d00', '#00bfa5']

export function ExecutiveReports({ onSelectDoc }: Props) {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const [data, setData] = useState<{ reports: ClusterReport[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ClusterReport | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API}/api/reports`).then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton />
  if (!data || !data.reports) return <div style={{ textAlign: 'center', padding: 60, color: theme.colors.textMuted }}>Nenhum relatório disponível</div>

  const filtered = (data.reports || []).filter(r =>
    !search || (r.clusterName || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.topKeywords || []).some(k => (k.word || '').toLowerCase().includes(search.toLowerCase()))
  ) || []

  if (selected) {
    return <ReportDetail report={selected} onBack={() => setSelected(null)} onSelectDoc={onSelectDoc} />
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
          Relatórios Executivos
        </h1>
        <p style={{ margin: '4px 0 12px', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          {data?.reports.length || 0} clusters temáticos com análise consolidada
        </p>
        <input
          type="text"
          placeholder="Filtrar relatórios..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: theme.colors.bgElevated,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            color: theme.colors.text,
            padding: '10px 14px',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            outline: 'none',
            width: '100%',
            maxWidth: 400,
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map((report, ci) => {
          const color = COLORS[ci % COLORS.length]
          return (
            <div
              key={report.clusterId}
              style={{
                ...cardBase,
                padding: '16px 20px',
                cursor: 'pointer',
                transition: theme.transitions.fast,
                borderLeft: `3px solid ${color}`,
              }}
              onClick={() => setSelected(report)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color + '60'; e.currentTarget.style.boxShadow = `0 0 20px ${color}10` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: theme.colors.text }}>
                      {report.clusterName}
                    </h3>
                    <span style={{
                      fontSize: '0.6rem', background: `${color}15`, color,
                      padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                    }}>
                      {report.stats.total_documents} docs
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: theme.colors.textMuted }}>
                    {(report.stats.total_words / 1000).toFixed(1)}k palavras · média {report.stats.avg_words} palavras/doc
                  </p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                    {(report.topKeywords || []).slice(0, 6).map((kw, ki) => (
                      <span key={ki} style={{
                        fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
                        background: `${color}10`, color,
                      }}>
                        {kw.word}
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ color: theme.colors.textMuted, fontSize: '1.2rem' }}>→</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReportDetail({ report, onBack, onSelectDoc }: { report: ClusterReport; onBack: () => void; onSelectDoc: (id: number) => void }) {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  return (
    <div>
      <button onClick={onBack} style={{
        border: 'none', background: 'none', color: theme.colors.accentLight,
        cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
        padding: '0 0 16px', fontFamily: 'inherit',
      }}>
        ← Voltar
      </button>

      <div style={cardBase}>
        <div style={{ padding: '20px 24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: theme.colors.text }}>
            {report.clusterName}
          </h2>
          <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: theme.colors.textMuted }}>
            {report.description}
          </p>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {(report.themeWords || []).map((w, i) => (
              <span key={i} style={{
                background: theme.colors.gradient, color: '#fff', padding: '3px 12px',
                borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
              }}>{w}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            <StatCard value={report.stats.total_documents} label="Documentos" color={theme.colors.accent} />
            <StatCard value={`${(report.stats.total_words / 1000).toFixed(1)}k`} label="Total Palavras" color={theme.colors.success} />
            <StatCard value={report.stats.avg_words} label="Média/doc" color={theme.colors.warning} />
          </div>

          <h3 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>
            🔑 Palavras-chave
          </h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {(report.topKeywords || []).map((kw, i) => (
              <span key={i} style={{
                background: `${theme.colors.accent}12`, color: theme.colors.accentLight,
                padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem',
                border: `1px solid ${theme.colors.accent}25`,
              }}>
                {kw.word} <strong style={{ color: theme.colors.text }}>({kw.count})</strong>
              </span>
            ))}
          </div>

          <h3 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>
            📄 Documentos
          </h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {(report.documents || []).map(doc => (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: theme.colors.bg,
                  borderRadius: theme.radius.sm, cursor: 'pointer',
                  border: '1px solid transparent', transition: theme.transitions.fast,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.colors.glassBorder; e.currentTarget.style.background = theme.colors.bgCardHover }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = theme.colors.bg }}
              >
                <span style={{ fontSize: '1rem' }}>
                  {doc.extension === '.pdf' ? '📄' : doc.extension?.startsWith('.doc') ? '📝' : doc.extension?.startsWith('.xls') ? '📊' : '📎'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500, color: theme.colors.text }}>{doc.name || 'Sem nome'}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: theme.colors.textMuted }}>
                    {(doc.word_count || 0).toLocaleString()} palavras · {doc.size_formatted || '-'}
                  </p>
                  {(doc.keywords || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                      {(doc.keywords || []).slice(0, 4).map((kw, ki) => (
                        <span key={ki} style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3, background: `${theme.colors.accent}10`, color: theme.colors.accentLight }}>{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  const { theme } = useTheme()
  return (
    <div style={{
      background: theme.colors.bg, padding: '10px', borderRadius: theme.radius.sm,
      textAlign: 'center', border: `1px solid ${color}20`,
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function LoadingSkeleton() {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  return (
    <div>
      <div style={{ height: 28, width: 250, background: theme.colors.bgElevated, borderRadius: 6, marginBottom: 16 }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ ...cardBase, padding: '16px 20px', marginBottom: 10 }}>
          <div style={{ height: 18, width: '40%', background: theme.colors.bgElevated, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 12, width: '60%', background: theme.colors.bgElevated, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
