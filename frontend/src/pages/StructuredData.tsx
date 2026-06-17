import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'
import { StructuredDataItem, SchemaInfo } from '../types'

export function StructuredData({ onSelectDoc }: { onSelectDoc?: (id: number) => void }) {
  const { theme: t } = useTheme()
  const [schemas, setSchemas] = useState<SchemaInfo[]>([])
  const [items, setItems] = useState<StructuredDataItem[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 50

  useEffect(() => {
    api.structuredData.schemas().then(r => setSchemas(r.schemas || [])).catch(() => {})
  }, [])

  const loadData = (p: number, schema: string) => {
    setLoading(true); setPage(p)
    const params: Record<string, string> = { limit: String(LIMIT), offset: String((p - 1) * LIMIT) }
    if (schema) params.schema_type = schema
    api.structuredData.list(params)
      .then(r => { setItems(r.data || []); setTotal(r.total || r.data?.length || 0); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadData(1, selectedSchema)
  }, [selectedSchema])

  const container: React.CSSProperties = {
    padding: '0 0 24px',
  }

  const title: React.CSSProperties = {
    fontSize: '1.5rem', fontWeight: 700, color: t.colors.text, marginBottom: 4,
  }

  const subtitle: React.CSSProperties = {
    fontSize: '0.8rem', color: t.colors.textMuted, marginBottom: 20,
  }

  const filterRow: React.CSSProperties = {
    display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap',
  }

  const filterBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: t.radius.sm, border: `1px solid ${t.colors.border}`,
    background: active ? t.colors.accent : t.colors.bgCard,
    color: active ? '#fff' : t.colors.textSecondary,
    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
    fontFamily: t.fonts.body, transition: t.transitions.fast,
  })

  const card: React.CSSProperties = {
    background: t.colors.bgCard, borderRadius: t.radius.lg,
    border: `1px solid ${t.colors.border}`, padding: 14, marginBottom: 8,
    transition: t.transitions.fast,
  }

  const badge: React.CSSProperties = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 20,
    fontSize: '0.65rem', fontWeight: 600,
    background: `${t.colors.accent}18`, color: t.colors.accent,
    border: `1px solid ${t.colors.accent}30`, marginRight: 6,
  }

  const tableContainer: React.CSSProperties = {
    width: '100%',
    overflowX: 'auto',
    background: t.colors.bgCard,
    borderRadius: t.radius.lg,
    border: `1px solid ${t.colors.border}`,
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontFamily: t.fonts.body,
    tableLayout: 'auto',
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${t.colors.border}`,
    color: t.colors.textSecondary,
    fontWeight: 600,
    background: t.colors.bgElevated,
    position: 'sticky',
    top: 0,
    zIndex: 1,
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${t.colors.border}40`,
    color: t.colors.text,
    maxWidth: 250,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  const headers = selectedSchema 
    ? Array.from(new Set(items.flatMap(item => Object.keys(item.data))))
    : [];

  return (
    <div style={container}>
      <h1 style={title}>📊 Dados Estruturados</h1>
      <p style={subtitle}>
        Dados importados automaticamente de planilhas e tabelas de documentos — {total} registros
      </p>

      <div style={filterRow}>
        <button style={filterBtn(!selectedSchema)} onClick={() => setSelectedSchema('')}>Todos</button>
        {schemas.map(s => (
          <button
            key={s.type}
            style={filterBtn(selectedSchema === s.type)}
            onClick={() => setSelectedSchema(s.type)}
          >
            {s.type} <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>({s.count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: t.colors.textMuted }}>Carregando...</p>
      ) : items.length === 0 ? (
        <p style={{ color: t.colors.textMuted }}>Nenhum dado encontrado para este schema.</p>
      ) : selectedSchema ? (
        <div style={tableContainer}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Doc ID</th>
                <th style={thStyle}>Tema</th>
                {headers.map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ transition: t.transitions.fast, cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.background = t.colors.hoverBg} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>
                    {item.source_file_id ? (
                      <button
                        onClick={() => onSelectDoc?.(item.source_file_id!)}
                        style={{ background: 'none', border: 'none', color: t.colors.accent, cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
                        title="Ver Documento Origem"
                      >
                        #{item.source_file_id}
                      </button>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...badge, background: `${t.colors.success}18`, color: t.colors.success, border: `1px solid ${t.colors.success}30`, margin: 0 }}>
                      {item.theme || '-'}
                    </span>
                  </td>
                  {headers.map(h => (
                    <td key={h} style={tdStyle} title={String(item.data[h] || '')}>
                      {String(item.data[h] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {items.map(item => (
            <div key={item.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={badge}>{item.schema_type}</span>
                <span style={{ ...badge, background: `${t.colors.success}18`, color: t.colors.success, border: `1px solid ${t.colors.success}30` }}>{item.theme}</span>
                {item.source_file_id && (
                  <button
                    onClick={() => onSelectDoc?.(item.source_file_id!)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: t.colors.accent, cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline' }}
                  >
                    Doc #{item.source_file_id} →
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                {Object.entries(item.data).slice(0, 6).map(([key, val]) => (
                  <div key={key} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: t.colors.textMuted }}>{key}: </span>
                    <span style={{ color: t.colors.text }} title={String(val)}>{String(val)}</span>
                  </div>
                ))}
                {Object.keys(item.data).length > 6 && (
                  <div style={{ fontSize: '0.7rem', color: t.colors.textMuted, marginTop: 4 }}>
                    + {Object.keys(item.data).length - 6} campos...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > LIMIT && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => loadData(page - 1, selectedSchema)}
            disabled={page <= 1}
            style={{
              padding: '8px 16px', border: `1px solid ${t.colors.border}`, borderRadius: t.radius.sm,
              background: t.colors.bgCard, color: t.colors.text, cursor: page <= 1 ? 'default' : 'pointer',
              fontSize: '0.8rem', fontFamily: t.fonts.body, opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            ← Anterior
          </button>
          {Array.from({ length: Math.ceil(total / LIMIT) }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
            <button
              key={p}
              onClick={() => loadData(p, selectedSchema)}
              style={{
                width: 34, height: 34, borderRadius: t.radius.sm,
                border: p === page ? 'none' : `1px solid ${t.colors.border}`,
                background: p === page ? t.colors.accent : t.colors.bgCard,
                color: p === page ? '#fff' : t.colors.textSecondary,
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: p === page ? 700 : 400,
              }}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => loadData(page + 1, selectedSchema)}
            disabled={page >= Math.ceil(total / LIMIT)}
            style={{
              padding: '8px 16px', border: `1px solid ${t.colors.border}`, borderRadius: t.radius.sm,
              background: t.colors.bgCard, color: t.colors.text, cursor: page >= Math.ceil(total / LIMIT) ? 'default' : 'pointer',
              fontSize: '0.8rem', fontFamily: t.fonts.body, opacity: page >= Math.ceil(total / LIMIT) ? 0.4 : 1,
            }}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
