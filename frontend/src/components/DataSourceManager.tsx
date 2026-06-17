import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useTheme } from '../ThemeContext'
import { Icons } from './FlatIcons'

interface DataSource {
  id: number
  path: string
  type: 'documentos' | 'fotos'
  label: string
  active: number
  has_photos: number
  last_scanned: string | null
}

interface BrowseEntry {
  name: string
  path: string
  isDirectory: boolean
}

export function DataSourceManager({ onScan }: { onScan?: (sourceId: number) => void }) {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const premiumInput = { background: theme.colors.bgElevated, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, color: theme.colors.text, padding: '10px 14px', fontSize: '0.85rem', fontFamily: theme.fonts.body, outline: 'none', transition: theme.transitions.fast, width: '100%', boxSizing: 'border-box' } as const

  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formPath, setFormPath] = useState('')
  const [formType, setFormType] = useState<'documentos' | 'fotos'>('documentos')
  const [formLabel, setFormLabel] = useState('')
  const [formHasPhotos, setFormHasPhotos] = useState(false)
  const [browsePath, setBrowsePath] = useState('')
  const [browseEntries, setBrowseEntries] = useState<BrowseEntry[]>([])
  const [showBrowser, setShowBrowser] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadSources = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.dataSources.list()
      setSources(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSources() }, [loadSources])

  const openBrowser = async (dirPath?: string) => {
    try {
      const entries = await api.dataSources.browse(dirPath || formPath || undefined)
      setBrowseEntries(entries)
      setBrowsePath(dirPath || formPath || '')
      setShowBrowser(true)
    } catch (e) {
      console.error(e)
    }
  }

  const navigateBrowser = async (newPath: string) => {
    try {
      const entries = await api.dataSources.browse(newPath)
      setBrowseEntries(entries)
      setBrowsePath(newPath)
    } catch (e) {
      console.error(e)
    }
  }

  const selectPath = (selectedPath: string) => {
    setFormPath(selectedPath)
    if (!formLabel) {
      const parts = selectedPath.replace(/\\/g, '/').split('/').filter(Boolean)
      const folderName = parts[parts.length - 1] || selectedPath
      setFormLabel(folderName)
    }
    setShowBrowser(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPath || !formLabel) return
    try {
      setStatusMsg(null)
      let newId = editingId
      if (editingId) {
        await api.dataSources.update(editingId, { path: formPath, label: formLabel, has_photos: formHasPhotos })
      } else {
        const result = await api.dataSources.create({ path: formPath, type: formType, label: formLabel, has_photos: formHasPhotos })
        newId = result?.id
      }
      resetForm()
      await loadSources()
      setStatusMsg({ type: 'success', text: editingId ? 'Fonte atualizada!' : 'Fonte adicionada!' })
      if (onScan && newId) onScan(newId)
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Erro ao salvar' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta fonte?')) return
    try {
      await api.dataSources.delete(id)
      await loadSources()
      setStatusMsg({ type: 'success', text: 'Fonte removida!' })
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Erro ao remover' })
    }
  }

  const handleToggleActive = async (source: DataSource) => {
    try {
      await api.dataSources.update(source.id, { active: !source.active })
      await loadSources()
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message })
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormPath('')
    setFormType('documentos')
    setFormLabel('')
    setFormHasPhotos(false)
  }

  const editSource = (source: DataSource) => {
    setEditingId(source.id)
    setFormPath(source.path)
    setFormType(source.type)
    setFormLabel(source.label)
    setFormHasPhotos(source.has_photos === 1)
    setShowForm(true)
  }

  const btnStyle = {
    padding: '8px 16px',
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.bgElevated,
    color: theme.colors.text,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: theme.fonts.body,
    transition: theme.transitions.fast,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  } as const

  const btnPrimaryStyle = {
    ...btnStyle,
    background: theme.colors.gradient,
    color: 'white',
    border: 'none',
    fontWeight: 600,
    boxShadow: theme.shadows.glow,
  } as const

  return (
    <div style={{ ...cardBase, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icons.Doc size={16} /> Fontes de Dados
        </h2>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          style={{
            ...btnPrimaryStyle,
            padding: '6px 14px',
            fontSize: '0.85rem',
          }}>
          + Adicionar Fonte
        </button>
      </div>

      {statusMsg && (
        <div role="alert" style={{
          padding: '10px 14px', borderRadius: theme.radius.sm, fontSize: '0.8rem',
          display: 'flex', alignItems: 'center', gap: 8,
          background: statusMsg.type === 'success' ? 'rgba(0,200,83,0.1)' : 'rgba(255,23,68,0.1)',
          border: `1px solid ${statusMsg.type === 'success' ? theme.colors.success : theme.colors.danger}`,
          color: statusMsg.type === 'success' ? theme.colors.success : theme.colors.danger,
        }}>
          {statusMsg.text}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...cardBase, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: theme.colors.bgElevated }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: 4, fontWeight: 600 }}>Tipo</label>
              <select value={formType} onChange={e => setFormType(e.target.value as any)}
                style={{ ...premiumInput, padding: '6px 10px', cursor: 'pointer' }}>
                <option value="documentos">📄 Documentos</option>
                <option value="fotos">📸 Fotos</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: 4, fontWeight: 600 }}>Nome / Rótulo</label>
              <input type="text" value={formLabel} onChange={e => setFormLabel(e.target.value)}
                placeholder="Ex: Plano de Comunicação 2026" style={premiumInput} required />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: theme.colors.textSecondary, marginBottom: 4, fontWeight: 600 }}>Caminho da Pasta</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={formPath} onChange={e => setFormPath(e.target.value)}
                placeholder="Ex: N:\\ASCOM\\2026\\ADM\\PLANO DE COMUNICAÇÃO" style={{ ...premiumInput, flex: 1 }} required />
              <button type="button" onClick={() => openBrowser()} style={{ ...btnStyle, whiteSpace: 'nowrap', padding: '6px 12px' }}>
                📂 Navegar
              </button>
            </div>
          </div>

          {formType === 'documentos' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: theme.colors.textSecondary, cursor: 'pointer' }}>
              <input type="checkbox" checked={formHasPhotos} onChange={e => setFormHasPhotos(e.target.checked)}
                style={{ accentColor: theme.colors.accent, cursor: 'pointer' }} />
              Esta pasta contém fotos relacionadas a documentos
            </label>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={resetForm} style={btnStyle}>Cancelar</button>
            <button type="submit" style={btnPrimaryStyle}>
              {editingId ? 'Atualizar' : 'Adicionar'} Fonte
            </button>
          </div>
        </form>
      )}

      {/* Folder Browser Modal */}
      {showBrowser && (
        <div role="dialog" aria-modal="true" aria-label="Selecionar pasta"
          style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowBrowser(false)}>
          <div style={{
            ...cardBase, padding: 20, width: 500, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
            background: theme.colors.bg,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: theme.colors.text }}>Selecionar Pasta</h3>
              <button onClick={() => setShowBrowser(false)} style={{ ...btnStyle, padding: '4px 8px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button onClick={() => navigateBrowser('')} style={{ ...btnStyle, padding: '4px 8px', fontSize: '0.75rem' }}>🏠 Raiz</button>
              <span style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: theme.colors.textMuted, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {browsePath || '(unidades de disco)'}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {browseEntries.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: theme.colors.textMuted, fontSize: '0.8rem' }}>Pasta vazia ou sem acesso</div>
              ) : browseEntries.map(entry => (
                <div key={entry.path} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                  borderRadius: theme.radius.sm, cursor: 'pointer', fontSize: '0.85rem', color: theme.colors.text,
                  transition: theme.transitions.fast,
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.colors.hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span onClick={() => navigateBrowser(entry.path)} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'pointer' }}>
                    <span>📁</span>
                    <span>{entry.name}</span>
                  </span>
                  <button onClick={() => selectPath(entry.path)}
                    style={{ ...btnStyle, padding: '2px 8px', fontSize: '0.7rem' }}>
                    Selecionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Source List */}
      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: theme.colors.textMuted, fontSize: '0.85rem' }}>
          Carregando fontes de dados...
        </div>
      ) : sources.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: theme.colors.textMuted, fontSize: '0.85rem' }}>
          Nenhuma fonte configurada. Clique em "+ Adicionar Fonte" para começar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.map(source => (
            <div key={source.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderRadius: theme.radius.md,
              background: source.active ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
              border: `1px solid ${source.active ? theme.colors.border : 'rgba(255,255,255,0.05)'}`,
              opacity: source.active ? 1 : 0.5,
            }}>
              <span style={{ fontSize: '1.1rem' }}>
                {source.type === 'fotos' ? '📸' : '📄'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: theme.colors.text }}>{source.label}</span>
                  <span style={{
                    fontSize: '0.65rem', padding: '1px 6px', borderRadius: 10,
                    background: source.type === 'fotos' ? `${theme.colors.success}22` : `${theme.colors.info}22`,
                    color: source.type === 'fotos' ? theme.colors.success : theme.colors.info,
                    fontWeight: 600, textTransform: 'uppercase',
                  }}>
                    {source.type === 'fotos' ? 'Fotos' : 'Documentos'}
                  </span>
                  {source.has_photos === 1 && (
                    <span style={{ fontSize: '0.65rem', color: theme.colors.accent }}>📎 link fotos</span>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: theme.colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {source.path}
                </div>
                <div style={{ fontSize: '0.65rem', color: theme.colors.textMuted }}>
                  {source.last_scanned ? `Último scan: ${new Date(source.last_scanned).toLocaleString('pt-BR')}` : 'Nunca escaneado'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => handleToggleActive(source)}
                  style={{
                    ...btnStyle, padding: '4px 8px', fontSize: '0.7rem',
                    background: source.active ? 'rgba(0,200,83,0.1)' : 'transparent',
                    borderColor: source.active ? 'rgba(0,200,83,0.3)' : theme.colors.border,
                  }}
                  title={source.active ? 'Desativar' : 'Ativar'}
                  aria-label={source.active ? `Desativar ${source.label}` : `Ativar ${source.label}`}>
                  {source.active ? '✅' : '⏸️'}
                </button>
                <button onClick={() => editSource(source)}
                  style={{ ...btnStyle, padding: '4px 8px', fontSize: '0.7rem' }}
                  aria-label={`Editar ${source.label}`}>
                  ✏️
                </button>
                <button onClick={() => handleDelete(source.id)}
                  style={{ ...btnStyle, padding: '4px 8px', fontSize: '0.7rem' }}
                  aria-label={`Remover ${source.label}`}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
