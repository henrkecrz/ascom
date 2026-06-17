import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'

import { API_BASE as API } from '../api'

interface Cluster {
  id: number; name: string; description: string; file_ids: string; theme_words: string
  documents: { id: number; name: string; extension: string; size_formatted: string; category: string; summary: string; keywords: string; word_count: number }[]
}

interface PlanData { clusters: Cluster[]; totalDocuments: number; documentsWithContent: number }

interface Props { onSelectDoc: (id: number) => void }

const COLORS = ['#7c4dff', '#00c853', '#ff9100', '#ff1744', '#00b8d4', '#aa00ff', '#ff6d00', '#00bfa5', '#d500f9', '#ff5722']

export function PlanView({ onSelectDoc }: Props) {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const [data, setData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch(`${API}/api/plan`).then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  const toggle = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading) return <LoadingSkeleton />
  if (!data || !data.clusters) return <div style={{ textAlign: 'center', padding: 60, color: theme.colors.textMuted }}>Nenhum cluster disponível</div>

  const ordered = [...(data.clusters || [])].sort((a, b) => (b.documents || []).length - (a.documents || []).length)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Plano Otimizado</h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          {data.totalDocuments} documentos agrupados em {data.clusters.length} clusters temáticos
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {ordered.map((cluster, ci) => {
          const isExpanded = expanded[cluster.id] ?? ci < 3
          const color = COLORS[ci % COLORS.length]
          const themeWords = cluster.theme_words ? cluster.theme_words.split(',').filter(Boolean) : []

          return (
            <div key={cluster.id} style={{ ...cardBase, overflow: 'hidden', borderLeft: `3px solid ${color}` }}>
              {/* Header */}
              <div
                onClick={() => toggle(cluster.id)}
                style={{
                  padding: '14px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: isExpanded ? `1px solid ${theme.colors.border}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', color,
                  }}>
                    {ci + 1}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: theme.colors.text }}>
                      {cluster.name || `Cluster ${ci + 1}`}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: theme.colors.textMuted }}>
                      {(cluster.documents || []).length} documentos
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {themeWords.length > 0 && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {themeWords.slice(0, 3).map((w, i) => (
                        <span key={i} style={{
                          fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4,
                          background: `${color}10`, color, display: 'none',
                        }} className="theme-word">{w}</span>
                      ))}
                    </div>
                  )}
                  <span style={{ color: theme.colors.textMuted, fontSize: '0.8rem', transition: theme.transitions.fast }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: '12px 18px 18px' }}>
                  {themeWords.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                      {themeWords.map((w, i) => (
                        <span key={i} style={{
                          fontSize: '0.68rem', padding: '2px 10px', borderRadius: 10,
                          background: `${color}12`, color, border: `1px solid ${color}25`,
                        }}>{w}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: 6 }}>
                    {(cluster.documents || []).map((doc, di) => {
                      const kws = doc.keywords ? doc.keywords.split(',').filter(Boolean).slice(0, 4) : []
                      return (
                        <div
                          key={doc.id}
                          onClick={() => onSelectDoc(doc.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', background: theme.colors.bg,
                            borderRadius: theme.radius.sm, cursor: 'pointer',
                            border: '1px solid transparent',
                            transition: theme.transitions.fast,
                            opacity: 0,
                            animation: `fadeIn 0.2s ease-out ${di * 0.03}s forwards`,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = theme.colors.glassBorder; e.currentTarget.style.background = theme.colors.bgCardHover }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = theme.colors.bg }}
                        >
                          <span style={{ fontSize: '1rem' }}>
                            {doc.extension === '.pdf' ? '📄' : (doc.extension || '').startsWith('.doc') ? '📝' : (doc.extension || '').startsWith('.xls') ? '📊' : '📎'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 500, color: theme.colors.text }}>{doc.name || 'Sem nome'}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: theme.colors.textMuted }}>
                              {doc.summary ? doc.summary.substring(0, 80) + '...' : (doc.category || 'Outros')}
                            </p>
                            {kws.length > 0 && (
                              <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                                {kws.map((kw, ki) => (
                                  <span key={ki} style={{ fontSize: '0.58rem', padding: '1px 5px', borderRadius: 3, background: `${color}10`, color }}>{kw}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: '0.62rem', color: theme.colors.textMuted, background: theme.colors.bgElevated, padding: '2px 6px', borderRadius: 4 }}>{doc.size_formatted}</span>
                        </div>
                      )
                    })}
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

function LoadingSkeleton() {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  return (
    <div>
      <div style={{ height: 28, width: 200, background: theme.colors.bgElevated, borderRadius: 6, marginBottom: 16 }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ ...cardBase, padding: '14px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: theme.colors.bgElevated }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 16, width: '30%', background: theme.colors.bgElevated, borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 12, width: '20%', background: theme.colors.bgElevated, borderRadius: 4 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
