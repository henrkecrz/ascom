import { useState, useEffect } from 'react'
import { theme, cardBase } from '../theme'
import { Download, Copy, Check } from 'lucide-react'

import { API_BASE as API, getToken } from '../api'

interface DocDetail {
  id: number; name: string; full_path: string; extension: string | null
  size_formatted: string; last_modified: string; category: string; parent_folder: string
  raw_text?: string; summary?: string; keywords?: string; topics?: string; word_count?: number
  doc_type?: string; doc_type_confidence?: number; plan_section?: string; entities?: string
}

interface RelatedDoc {
  score: number; shared_keywords: string
  file: { id: number; name: string; extension: string; size_formatted: string; category: string }
}

interface Props { id: number; onBack: () => void; onRelated: (id: number) => void }

type Tab = 'resumo' | 'conteudo' | 'visualizacao' | 'relacionados'

export function DocumentDetail({ id, onBack, onRelated }: Props) {
  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [related, setRelated] = useState<RelatedDoc[]>([])
  const [tab, setTab] = useState<Tab>('resumo')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleDownloadFicha = () => {
    if (!doc) return
    const content = `FICHA EXECUTIVA: ${doc.name}
Categoria: ${doc.category}
Formato: ${doc.extension}
Tamanho: ${doc.size_formatted}
Modificado em: ${doc.last_modified ? new Date(doc.last_modified).toLocaleDateString('pt-BR') : '-'}
${doc.word_count ? `Palavras: ${doc.word_count}` : ''}

=== RESUMO AUTOMÁTICO ===
${doc.summary || 'Nenhum resumo disponível.'}

=== PALAVRAS-CHAVE ===
${doc.keywords || 'Nenhuma'}

=== TÓPICOS ===
${doc.topics || 'Nenhum'}

=== ENTIDADES ===
${doc.entities && doc.entities !== '{}' ? JSON.stringify(JSON.parse(doc.entities), null, 2) : 'Nenhuma'}
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Ficha_${doc.name}.txt`
    link.click()
  }

  const handleCopyText = async () => {
    if (!doc?.raw_text) return
    try {
      await navigator.clipboard.writeText(doc.raw_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar texto', err)
    }
  }

  useEffect(() => {
    fetch(`${API}/api/documents/${id}`).then(r => r.json()).then(setDoc).catch(console.error)
    fetch(`${API}/api/documents/${id}/related`).then(r => r.json()).then(setRelated).catch(console.error)
    // Reset objectUrl when id changes
    setObjectUrl(null)
  }, [id])

  const ext = (doc?.extension || '').toLowerCase()
  const isSupported = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt'].includes(ext)

  useEffect(() => {
    if (tab === 'visualizacao' && doc && isSupported && !objectUrl) {
      const token = getToken()
      fetch(`${API}/api/documents/${id}/view`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(r => {
        if (!r.ok) throw new Error('Falha ao obter visualização')
        return r.blob()
      })
      .then(blob => {
        const url = URL.createObjectURL(blob)
        setObjectUrl(url)
      })
      .catch(err => {
        console.error(err)
      })
    }
  }, [tab, doc, id, isSupported, objectUrl])

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  const handleOpenOriginal = () => {
    if (!doc) return
    const token = getToken()
    fetch(`${API}/api/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ path: doc.full_path })
    })
    .then(r => r.json())
    .then(res => {
      if (res.error) alert(`Erro: ${res.error}`)
    })
    .catch(err => {
      console.error(err)
      alert('Erro ao tentar abrir o arquivo original.')
    })
  }

  if (!doc) return <LoadingSkeleton />

  const keywordList = (doc.keywords || '').split(',').filter(Boolean)
  const topicList = (doc.topics || '').split(',').filter(Boolean)

  const extIcons: Record<string, string> = {
    '.pdf': '📄', '.doc': '📝', '.docx': '📝', '.xlsx': '📊', '.xls': '📊',
    '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.webp': '🖼️', '.pptx': '📽️', '.ppt': '📽️', '.txt': '📃',
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'resumo', label: 'Resumo', icon: '📋' },
    { key: 'conteudo', label: 'Texto Extraído', icon: '📄' },
    { key: 'visualizacao', label: 'Visualização Inline', icon: '👁️' },
    { key: 'relacionados', label: `Relacionados (${related.length})`, icon: '🔗' },
  ]

  return (
    <div>
      <button onClick={onBack} style={{
        border: 'none', background: 'none', color: theme.colors.accentLight,
        cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
        padding: '0 0 16px', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        ← Voltar ao Dashboard
      </button>

      {/* Document Header */}
      <div style={{ ...cardBase, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <span style={{ fontSize: '2.8rem' }}>{extIcons[doc.extension || ''] || '📎'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: theme.colors.text, lineHeight: 1.3 }}>
              {doc.name}
            </h1>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Tag color={theme.colors.accent}>{doc.extension?.toUpperCase() || '---'}</Tag>
              <Tag color={theme.colors.success}>{doc.size_formatted}</Tag>
              <Tag color={theme.colors.info}>{doc.category}</Tag>
              {(doc.word_count ?? 0) > 0 && <Tag color={theme.colors.warning}>{doc.word_count} palavras</Tag>}
              {doc.doc_type && doc.doc_type !== 'outro' && (
                <Tag color="#7c4dff">{doc.doc_type.replace(/_/g, ' ')}</Tag>
              )}
              {doc.plan_section && <Tag color="#00b8d4">{doc.plan_section}</Tag>}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: theme.colors.textMuted }}>
              {doc.parent_folder} · {doc.last_modified ? new Date(doc.last_modified).toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', marginTop: 4 }}>
            <button onClick={handleDownloadFicha} style={{
              padding: '10px 18px', border: 'none',
              background: theme.colors.gradient, color: '#fff',
              borderRadius: theme.radius.md, fontSize: '0.78rem', cursor: 'pointer',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              transition: theme.transitions.fast, boxShadow: theme.shadows.sm,
            }}>
              <Download size={14} /> Ficha Executiva
            </button>
            <button onClick={handleOpenOriginal} style={{
              padding: '8px 16px', border: `1px solid ${theme.colors.border}`,
              background: theme.colors.bgElevated, color: theme.colors.text,
              borderRadius: theme.radius.md, fontSize: '0.75rem', cursor: 'pointer',
              fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
              transition: theme.transitions.fast,
            }}>
              Abrir Original ↗️
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="segmented-control" style={{ marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`segmented-btn ${tab === t.key ? 'active' : ''}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'resumo' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {topicList.length > 0 && (
            <div style={cardBase}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border}` }}>
                <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>🏷️ Tópicos</h3>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {topicList.map((t, i) => (
                  <span key={i} style={{
                    background: `${theme.colors.accent}15`,
                    color: theme.colors.accentLight,
                    padding: '4px 14px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    border: `1px solid ${theme.colors.accent}30`,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {doc.summary && (
            <div style={cardBase}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border}` }}>
                <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>📝 Resumo Automático</h3>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: theme.colors.textSecondary, lineHeight: 1.7 }}>
                  {doc.summary}
                </p>
              </div>
            </div>
          )}

          {keywordList.length > 0 && (
            <div style={cardBase}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border}` }}>
                <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>🔑 Palavras-chave</h3>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {keywordList.map((kw, i) => {
                  const tagColors = [theme.colors.accent, theme.colors.success, theme.colors.warning, theme.colors.info, theme.colors.danger]
                  return (
                    <span key={i} style={{
                      background: `${tagColors[i % tagColors.length]}12`,
                      color: tagColors[i % tagColors.length],
                      padding: '3px 10px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      border: `1px solid ${tagColors[i % tagColors.length]}25`,
                    }}>{kw}</span>
                  )
                })}
              </div>
            </div>
          )}

          {doc.entities && doc.entities !== '{}' && (
            <div style={cardBase}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border}` }}>
                <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>🏛️ Entidades Extraídas</h3>
              </div>
              <div style={{ padding: '14px 20px' }}>
                {(() => {
                  try {
                    const e = JSON.parse(doc.entities!)
                    return (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {e.persons?.length > 0 && <EntityGroup label="Pessoas" items={e.persons} color="#7c4dff" />}
                        {e.organizations?.length > 0 && <EntityGroup label="Organizações" items={e.organizations} color="#2979ff" />}
                        {e.programs?.length > 0 && <EntityGroup label="Programas" items={e.programs} color="#00e676" />}
                        {e.locations?.length > 0 && <EntityGroup label="Locais" items={e.locations} color="#ff9100" />}
                        {e.dates?.length > 0 && <EntityGroup label="Datas" items={e.dates.map((d: any) => d.text)} color="#ff1744" />}
                        {e.values?.length > 0 && <EntityGroup label="Valores" items={e.values} color="#aa00ff" />}
                        {e.mediaVehicles?.length > 0 && <EntityGroup label="Veículos" items={e.mediaVehicles} color="#00bfa5" />}
                      </div>
                    )
                  } catch { return null }
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'conteudo' && (
        <div style={cardBase}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>📄 Conteúdo Extraído</h3>
            {doc.raw_text && (
              <button onClick={handleCopyText} style={{
                padding: '6px 12px', border: `1px solid ${theme.colors.border}`,
                background: copied ? theme.colors.success : theme.colors.bgElevated,
                color: copied ? '#fff' : theme.colors.text,
                borderRadius: theme.radius.sm, fontSize: '0.75rem', cursor: 'pointer',
                fontWeight: 500, transition: theme.transitions.fast,
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
            )}
          </div>
          <div style={{ padding: '16px 20px', maxHeight: 500, overflow: 'auto' }}>
            {doc.raw_text ? (
              <pre style={{
                margin: 0,
                fontSize: '0.78rem',
                color: theme.colors.textSecondary,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                fontFamily: theme.fonts.mono,
              }}>{doc.raw_text}</pre>
            ) : (
              <p style={{ color: theme.colors.textMuted, fontSize: '0.85rem' }}>
                Conteúdo não disponível para este arquivo.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'visualizacao' && (
        <div style={cardBase}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>👁️ Visualização Inline</h3>
            <button onClick={handleOpenOriginal} style={{
              padding: '6px 12px', border: `1px solid ${theme.colors.border}`,
              background: theme.colors.bgElevated, color: theme.colors.text,
              borderRadius: theme.radius.sm, fontSize: '0.7rem', cursor: 'pointer',
              fontWeight: 600, transition: theme.transitions.fast
            }}>
              Abrir no Computador ↗️
            </button>
          </div>
          <div style={{ padding: 12, height: 600, display: 'flex', flexDirection: 'column' }}>
            {isSupported ? (
              objectUrl ? (
                <iframe
                  src={objectUrl}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: theme.radius.sm }}
                  title="Visualizador Inline"
                />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.textMuted }}>
                  Carregando visualização...
                </div>
              )
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: theme.colors.textMuted, padding: 40 }}>
                <span>Visualização inline não suportada para arquivos {doc.extension?.toUpperCase() || 'deste tipo'}.</span>
                <button onClick={handleOpenOriginal} style={{
                  padding: '10px 20px', border: 'none',
                  background: theme.colors.gradient, color: '#fff',
                  borderRadius: theme.radius.md, fontSize: '0.78rem', cursor: 'pointer',
                  fontWeight: 600, boxShadow: theme.shadows.glow
                }}>
                  Abrir Original no Computador
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'relacionados' && (
        <div style={cardBase}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border}` }}>
            <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: theme.colors.text }}>🔗 Documentos Relacionados</h3>
          </div>
          <div style={{ padding: '12px 16px 16px', display: 'grid', gap: 6 }}>
            {related.length === 0 && (
              <p style={{ color: theme.colors.textMuted, fontSize: '0.82rem', textAlign: 'center', padding: 20 }}>
                Nenhum documento relacionado encontrado.
              </p>
            )}
            {related.map((r, i) => {
              const pct = (r.score * 100).toFixed(0)
              const color = r.score > 0.3 ? theme.colors.success : r.score > 0.15 ? theme.colors.warning : theme.colors.textMuted
              return (
                <div
                  key={i}
                  onClick={() => onRelated(r.file.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: theme.colors.bg,
                    borderRadius: theme.radius.sm,
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: theme.transitions.fast,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = theme.colors.glassBorder; e.currentTarget.style.background = theme.colors.bgCardHover }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = theme.colors.bg }}
                >
                  <span style={{ fontSize: '1.1rem' }}>
                    {r.file.extension === '.pdf' ? '📄' : r.file.extension?.startsWith('.doc') ? '📝' : '📎'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 500, color: theme.colors.text }}>
                      {r.file.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: theme.colors.textMuted }}>
                      {r.file.category} · {r.file.size_formatted}
                    </p>
                  </div>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    border: `1px solid ${color}30`,
                  }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color }}>{pct}%</span>
                    <span style={{ fontSize: '0.5rem', color, opacity: 0.6 }}>match</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function EntityGroup({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: '0.7rem', fontWeight: 600, color: theme.colors.textMuted }}>{label}</p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {items.map((item: string, i: number) => (
          <span key={i} style={{
            background: `${color}12`, color, padding: '2px 8px',
            borderRadius: 4, fontSize: '0.72rem',
            border: `1px solid ${color}20`,
            transition: 'transform 0.15s ease',
            cursor: 'default',
            display: 'inline-block'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      background: `${color}12`,
      color: color,
      padding: '2px 10px',
      borderRadius: 6,
      fontSize: '0.7rem',
      fontWeight: 600,
      border: `1px solid ${color}20`,
    }}>
      {children}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ height: 20, width: 120, background: theme.colors.bgElevated, borderRadius: 4, marginBottom: 16 }} />
      <div style={{ ...cardBase, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: theme.colors.bgElevated }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 20, width: '60%', background: theme.colors.bgElevated, borderRadius: 4, marginBottom: 10 }} />
            <div style={{ height: 14, width: '40%', background: theme.colors.bgElevated, borderRadius: 4 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
