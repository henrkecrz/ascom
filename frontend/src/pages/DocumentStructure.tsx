import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'
import { DocumentSection, FileInfo } from '../types'

export function DocumentStructure({ onSelectDoc }: { onSelectDoc?: (id: number) => void }) {
  const { theme: t } = useTheme()
  const [docs, setDocs] = useState<FileInfo[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [sections, setSections] = useState<DocumentSection[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    api.files.list({ limit: '100' }).then(r => setDocs(r.files || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedDocId) return
    setLoading(true)
    api.documentSections.list(selectedDocId)
      .then(r => { setSections(Array.isArray(r) ? r : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedDocId])

  const filteredDocs = docs.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (d.extension === '.docx' || d.extension === '.doc' || d.extension === '.pdf')
  )

  const container: React.CSSProperties = { padding: '0 0 24px' }
  const title: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, color: t.colors.text, marginBottom: 4 }
  const subtitle: React.CSSProperties = { fontSize: '0.8rem', color: t.colors.textMuted, marginBottom: 16 }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: t.radius.md,
    border: `1px solid ${t.colors.border}`, background: t.colors.bgElevated,
    color: t.colors.text, fontSize: '0.8rem', fontFamily: t.fonts.body,
    outline: 'none', marginBottom: 16, boxSizing: 'border-box',
  }

  const docBtn = (active: boolean): React.CSSProperties => ({
    display: 'block', width: '100%', padding: '8px 12px', marginBottom: 4,
    borderRadius: t.radius.sm, border: 'none',
    background: active ? t.colors.hoverBg : 'transparent',
    color: active ? t.colors.accent : t.colors.textSecondary,
    cursor: 'pointer', fontSize: '0.75rem', fontFamily: t.fonts.body,
    textAlign: 'left', transition: t.transitions.fast,
  })

  const sectionCard: React.CSSProperties = {
    background: t.colors.bgCard, borderRadius: t.radius.lg,
    border: `1px solid ${t.colors.border}`, padding: 14, marginBottom: 8,
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: '0.85rem', fontWeight: 600, color: t.colors.text, marginBottom: 4,
  }

  const sectionContent: React.CSSProperties = {
    fontSize: '0.75rem', color: t.colors.textSecondary, lineHeight: 1.5,
    whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'hidden',
  }

  const tag: React.CSSProperties = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 20,
    fontSize: '0.6rem', fontWeight: 600,
    background: `${t.colors.accent}15`, color: t.colors.accent,
    border: `1px solid ${t.colors.accent}25`, margin: '2px 3px',
  }

  return (
    <div style={container}>
      <h1 style={title}>📄 Estrutura de Documentos</h1>
      <p style={subtitle}>Seções e conteúdo extraído de documentos DOCX</p>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 260px' }}>
          <input
            placeholder="Buscar documento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={inputStyle}
          />
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {filteredDocs.slice(0, 50).map(doc => (
              <button
                key={doc.id}
                style={docBtn(selectedDocId === doc.id)}
                onClick={() => { setSelectedDocId(doc.id); onSelectDoc?.(doc.id) }}
              >
                {doc.extension === '.docx' ? '📄' : '📕'} {doc.name.substring(0, 40)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          {!selectedDocId && (
            <p style={{ color: t.colors.textMuted, fontSize: '0.8rem' }}>
              Selecione um documento à esquerda para ver suas seções.
            </p>
          )}
          {loading && <p style={{ color: t.colors.textMuted }}>Carregando seções...</p>}
          {!loading && sections.length === 0 && selectedDocId && (
            <p style={{ color: t.colors.textMuted }}>Nenhuma seção extraída neste documento.</p>
          )}
          {sections.map(sec => (
            <div key={sec.id} style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: '0.6rem', color: t.colors.textMuted, background: t.colors.bgElevated, padding: '1px 6px', borderRadius: 4 }}>
                  H{sec.section_level}
                </span>
                <span style={sectionTitle}>{sec.section_title || 'Conteúdo'}</span>
                {sec.has_table && (
                  <span style={{ ...tag, background: `${t.colors.info}15`, color: t.colors.info, border: `1px solid ${t.colors.info}25` }}>tabela</span>
                )}
              </div>
              {sec.content && (
                <div style={sectionContent}>
                  {sec.content.substring(0, 500)}
                  {sec.content.length > 500 && '...'}
                </div>
              )}
              {sec.extracted_entities && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {(sec.extracted_entities as any).persons?.map((p: string, i: number) => (
                    <span key={i} style={{ ...tag, background: `${t.colors.success}15`, color: t.colors.success, border: `1px solid ${t.colors.success}25` }}>{p}</span>
                  ))}
                  {(sec.extracted_entities as any).organizations?.map((o: string, i: number) => (
                    <span key={i} style={{ ...tag, background: `${t.colors.warning}15`, color: t.colors.warning, border: `1px solid ${t.colors.warning}25` }}>{o}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
