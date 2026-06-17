import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'
import { Icons } from '../components/FlatIcons'

interface Topic {
  id: number
  title: string
  category: string
  approved: string[]
  restricted: string[]
}

export function TalkingPointsMatrix() {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const gradientText = { background: theme.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
  const premiumInput = { background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, color: theme.colors.text, padding: '10px 14px', fontSize: '0.85rem', fontFamily: theme.fonts.body, outline: 'none', transition: theme.transitions.fast, width: '100%', boxSizing: 'border-box' } as const

  const [topics, setTopics] = useState<Topic[]>([])
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)

  const loadTopics = (category?: string) => {
    api.talkingPoints.list(category || undefined)
      .then(d => {
        setTopics(d.topics)
        if (!selectedTopic && d.topics.length > 0) setSelectedTopic(d.topics[0])
      })
      .catch(console.error)
  }

  useEffect(() => {
    api.talkingPoints.categories()
      .then(d => setCategories(d.categories))
      .catch(console.error)
    loadTopics()
  }, [])

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    setSelectedTopic(null)
    loadTopics(cat || undefined)
  }

  const filtered = topics.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )

  const categoryLabels: Record<string, string> = {
    crise: 'Crise',
    Infraestrutura: 'Infraestrutura',
    Jurídico: 'Jurídico',
    Emergências: 'Emergências',
    geral: 'Geral',
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.Lock size={20} /> Matriz de Temas Sensíveis
        </h1>
        <p style={{ margin: '4px 0 0', color: theme.colors.textSecondary, fontSize: '0.85rem' }}>
          Guia rápido de discurso oficial para alinhamento da assessoria e porta-vozes
          {topics.length > 0 && <span style={{ color: theme.colors.textMuted }}> · {topics.length} temas{topics.some(t => t.id > 100) ? ' · gerados automaticamente pela IA' : ''}</span>}
        </p>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => handleCategoryChange('')}
            style={{
              padding: '5px 12px', border: 'none', borderRadius: 16,
              background: !selectedCategory ? theme.colors.gradient : theme.colors.bgElevated,
              color: !selectedCategory ? '#fff' : theme.colors.textSecondary,
              cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, fontFamily: 'inherit',
            }}>
            Todas
          </button>
          {categories.map(c => (
            <button key={c.category} onClick={() => handleCategoryChange(c.category)}
              style={{
                padding: '5px 12px', border: 'none', borderRadius: 16,
                background: selectedCategory === c.category ? theme.colors.gradient : theme.colors.bgElevated,
                color: selectedCategory === c.category ? '#fff' : theme.colors.textSecondary,
                cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, fontFamily: 'inherit',
              }}>
              {categoryLabels[c.category] || c.category} ({c.count})
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Left Side: Topic List */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tema sensível..." style={premiumInput} />
          </div>
          {filtered.length === 0 ? (
            <div style={{ ...cardBase, padding: 24, textAlign: 'center', color: theme.colors.textMuted, fontSize: '0.78rem' }}>
              Nenhum tema encontrado. Os temas são gerados automaticamente pela IA durante o processamento dos documentos.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(t => {
                const active = selectedTopic?.id === t.id
                return (
                  <div key={t.id} onClick={() => setSelectedTopic(t)}
                    style={{
                      ...cardBase, padding: 12, cursor: 'pointer',
                      background: active ? `${theme.colors.accent}15` : theme.colors.bgElevated,
                      borderColor: active ? theme.colors.accent : theme.colors.border,
                      transition: theme.transitions.fast
                    }}>
                    <span style={{ fontSize: '0.62rem', color: theme.colors.textMuted, display: 'block', marginBottom: 2 }}>
                      {t.category}
                    </span>
                    <strong style={{ fontSize: '0.8rem', color: active ? theme.colors.accentLight : theme.colors.text }}>
                      {t.title}
                    </strong>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Side: Matrix (Approved vs Restricted) */}
        <div>
          {selectedTopic ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...cardBase, padding: 16, background: 'rgba(26,26,46,0.3)' }}>
                <span style={{ fontSize: '0.65rem', color: theme.colors.textMuted }}>TEMA SELECIONADO</span>
                <h2 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 700, color: theme.colors.text }}>
                  {selectedTopic.title}
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Approved (Fale isso) */}
                <div style={{ ...cardBase, borderTop: `4px solid ${theme.colors.success}`, padding: 16, background: 'rgba(0, 200, 83, 0.03)' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: theme.colors.success, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icons.CheckCircle size={14} style={{ color: theme.colors.success }} /> Fatos Aprovados (O que falar)
                  </h3>
                  <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.78rem', color: theme.colors.textSecondary, display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.5 }}>
                    {selectedTopic.approved.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Restricted (NÃO fale isso) */}
                <div style={{ ...cardBase, borderTop: `4px solid ${theme.colors.danger}`, padding: 16, background: 'rgba(255, 23, 68, 0.03)' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: theme.colors.danger, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icons.XCircle size={14} style={{ color: theme.colors.danger }} /> Restrições de Discurso (O que NÃO falar)
                  </h3>
                  <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.78rem', color: theme.colors.textSecondary, display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.5 }}>
                    {selectedTopic.restricted.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...cardBase, padding: 40, textAlign: 'center', color: theme.colors.textMuted }}>
              Selecione um tema à esquerda para visualizar as diretrizes de discurso.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
