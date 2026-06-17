import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../ThemeContext'

import { API_BASE as API } from '../api'

interface SearchResult {
  id: number; name: string; extension: string; size_formatted: string
  category: string; summary: string; keywords: string; score: number
  match_count: number; snippet: string
}

interface Props { onSelectDoc: (id: number) => void }

const EXAMPLES = [
  'comunicação interna 2020',
  'campanha plantando sorrisos',
  'plano estratégico',
  'festa junina',
  'projetos 2020',
  'rede mais mulher',
]

export function SmartSearch({ onSelectDoc }: Props) {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [page, setPage] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)
  const LIMIT = 20

  useEffect(() => {
    fetch(`${API}/api/search/suggestions`).then(r => r.json()).then(d => setSuggestions(d.suggestions || [])).catch(() => {})
  }, [])

  const doSearch = (q: string, p = 1) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true); setSearched(true); setShowSuggestions(false); setPage(p)
    const offset = (p - 1) * LIMIT
    fetch(`${API}/api/search?q=${encodeURIComponent(trimmed)}&limit=${LIMIT}&offset=${offset}`)
      .then(r => r.json()).then(d => { setResults(d.results); setTotal(d.total) })
      .catch(console.error).finally(() => setLoading(false))
  }

  const filteredSuggestions = query.length >= 2
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
          Busca Inteligente
        </h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          Faça perguntas em linguagem natural e encontre documentos relevantes
        </p>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{
          display: 'flex',
          gap: 8,
          background: theme.colors.bgCard,
          borderRadius: theme.radius.lg,
          padding: '4px 4px 4px 18px',
          border: `2px solid ${query ? theme.colors.accent : theme.colors.border}`,
          transition: theme.transitions.fast,
          boxShadow: query ? `0 0 30px ${theme.colors.accent}15` : 'none',
        }}>
          <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', opacity: 0.5 }}>🤖</span>
          <input
            ref={inputRef}
            type="text"
            placeholder='Ex: "O que foi feito para comunicação interna em 2020?"'
            value={query}
            aria-label="Termo de busca"
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
            onFocus={() => filteredSuggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              padding: '14px 0',
              fontSize: '0.9rem',
              color: theme.colors.text,
              outline: 'none',
              fontFamily: 'inherit',
              minWidth: 0,
            }}
          />
          <button
            onClick={() => doSearch(query)}
            disabled={!query.trim() || loading}
            aria-label={loading ? 'Buscando...' : 'Buscar'}
            style={{
              background: query.trim() ? theme.colors.gradient : theme.colors.bgElevated,
              color: '#fff',
              border: 'none',
              padding: '10px 28px',
              borderRadius: theme.radius.md,
              cursor: query.trim() ? 'pointer' : 'default',
              fontWeight: 600,
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              transition: theme.transitions.fast,
              opacity: query.trim() ? 1 : 0.5,
            }}
          >
            {loading ? 'Buscando...' : 'Buscar →'}
          </button>
        </div>

        {showSuggestions && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
            background: theme.colors.bgElevated,
            borderRadius: theme.radius.md,
            marginTop: 6,
            boxShadow: theme.shadows.lg,
            border: `1px solid ${theme.colors.border}`,
            maxHeight: 260,
            overflow: 'auto',
          }}>
            {filteredSuggestions.map(s => (
              <div
                key={s}
                onClick={() => { setQuery(s); setShowSuggestions(false); doSearch(s, 1) }}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  borderBottom: `1px solid ${theme.colors.border}`,
                  color: theme.colors.textSecondary,
                  transition: theme.transitions.fast,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.colors.bgCard; e.currentTarget.style.color = theme.colors.text }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.colors.textSecondary }}
              >
                🔍 {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Examples */}
      {!searched && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: '0.75rem', color: theme.colors.textMuted, marginBottom: 8, letterSpacing: '0.3px' }}>
            PERGUNTAS SUGERIDAS
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EXAMPLES.map(q => (
              <button
                key={q}
                onClick={() => { setQuery(q); doSearch(q, 1) }}
                style={{
                  background: theme.colors.bgElevated,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 20,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  color: theme.colors.textSecondary,
                  fontFamily: 'inherit',
                  transition: theme.transitions.fast,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.colors.accent; e.currentTarget.style.color = theme.colors.accentLight }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.color = theme.colors.textSecondary }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searched && !loading && (
        <div>
          <p style={{ fontSize: '0.8rem', color: theme.colors.textMuted, marginBottom: 12 }}>
            {total} resultado(s) para "<strong style={{ color: theme.colors.text }}>{query}</strong>"
          </p>

          {results.length === 0 ? (
            <div style={{ ...cardBase, textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: '2.5rem', margin: '0 0 12px' }}>🔍</p>
              <p style={{ color: theme.colors.textSecondary, fontSize: '0.9rem', margin: 0 }}>
                Nenhum resultado encontrado
              </p>
              <p style={{ color: theme.colors.textMuted, fontSize: '0.8rem', marginTop: 4 }}>
                Tente termos diferentes ou menos específicos
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {results.map((r, i) => (
                <ResultCard key={r.id} result={r} onClick={() => onSelectDoc(r.id)} index={i} />
              ))}
            </div>
          )}

          {total > LIMIT && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => doSearch(query, page - 1)}
                disabled={page <= 1}
                style={{
                  padding: '8px 16px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm,
                  background: theme.colors.bgCard, color: theme.colors.text, cursor: page <= 1 ? 'default' : 'pointer',
                  fontSize: '0.8rem', fontFamily: 'inherit', opacity: page <= 1 ? 0.4 : 1,
                }}
                aria-label="Página anterior"
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.ceil(total / LIMIT) }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
                <button
                  key={p}
                  onClick={() => doSearch(query, p)}
                  style={{
                    width: 34, height: 34, borderRadius: theme.radius.sm,
                    border: p === page ? 'none' : `1px solid ${theme.colors.border}`,
                    background: p === page ? theme.colors.gradient : theme.colors.bgCard,
                    color: p === page ? '#fff' : theme.colors.textSecondary,
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: p === page ? 700 : 400,
                    fontFamily: 'inherit',
                  }}
                  aria-label={`Página ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => doSearch(query, page + 1)}
                disabled={page >= Math.ceil(total / LIMIT)}
                style={{
                  padding: '8px 16px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm,
                  background: theme.colors.bgCard, color: theme.colors.text, cursor: page >= Math.ceil(total / LIMIT) ? 'default' : 'pointer',
                  fontSize: '0.8rem', fontFamily: 'inherit', opacity: page >= Math.ceil(total / LIMIT) ? 0.4 : 1,
                }}
                aria-label="Próxima página"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 20,
            border: `3px solid ${theme.colors.border}`,
            borderTopColor: theme.colors.accent,
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: theme.colors.textMuted, fontSize: '0.85rem', margin: 0 }}>Analisando documentos...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
    </div>
  )
}

function ResultCard({ result, onClick, index }: { result: SearchResult; onClick: () => void; index: number }) {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const icons: Record<string, string> = {
    '.pdf': '📄', '.doc': '📝', '.docx': '📝', '.xlsx': '📊', '.xls': '📊',
    '.jpg': '🖼️', '.png': '🖼️', '.webp': '🖼️', '.pptx': '📽️', '.txt': '📃',
  }

  const kwList = result.keywords ? result.keywords.split(',').filter(Boolean).slice(0, 4) : []
  const scoreColor = result.score > 10 ? theme.colors.success : result.score > 5 ? theme.colors.warning : theme.colors.textMuted

  return (
    <div
      onClick={onClick}
      style={{
        ...cardBase,
        padding: '14px 18px',
        cursor: 'pointer',
        opacity: 0,
        animation: `fadeIn 0.3s ease-out ${index * 0.04}s forwards`,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = theme.colors.glassBorder; e.currentTarget.style.boxShadow = theme.shadows.glow }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: '1.3rem' }}>{icons[result.extension || ''] || '📎'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: theme.colors.text }}>{result.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: theme.colors.textMuted }}>
            {result.category} · {result.size_formatted} · {result.match_count} ocorrências
          </p>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 24,
          background: `${scoreColor}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          border: `1px solid ${scoreColor}25`,
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: scoreColor }}>{(result.score).toFixed(0)}</span>
          <span style={{ fontSize: '0.5rem', color: scoreColor, opacity: 0.6 }}>score</span>
        </div>
      </div>

      {result.summary && (
        <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: theme.colors.textSecondary, lineHeight: 1.5 }}>
          {result.summary}
        </p>
      )}

      <div style={{
        fontSize: '0.75rem', color: theme.colors.textMuted,
        background: theme.colors.bg, padding: '8px 10px', borderRadius: theme.radius.sm,
        lineHeight: 1.5, fontFamily: theme.fonts.mono,
        border: `1px solid ${theme.colors.border}`,
      }}>
        {result.snippet}
      </div>

      {kwList.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {kwList.map((kw, i) => (
            <span key={i} style={{
              fontSize: '0.62rem', padding: '2px 7px', borderRadius: 4,
              background: `${theme.colors.accent}10`, color: theme.colors.accentLight,
              border: `1px solid ${theme.colors.accent}20`,
            }}>{kw}</span>
          ))}
        </div>
      )}
    </div>
  )
}
