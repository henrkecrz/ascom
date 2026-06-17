import { useState, useEffect } from 'react'
import { api } from '../api'
import { useTheme } from '../ThemeContext'
import { Icons } from './FlatIcons'

interface ImportPreviewItem {
  fileId: number
  fileName: string
  filePath: string
  extension: string
  schema: {
    dataType: string
    confidence: number
    tableName: string
    description: string
    columns: Array<{ name: string; type: string; description: string }>
  }
  rowCount: number
  sampleRows: any[][]
  issues: string[]
}

interface PreviewResponse {
  sourceId: number
  sourceLabel: string
  totalFiles: number
  previews: ImportPreviewItem[]
}

interface ImportResult {
  fileName: string
  success: boolean
  tableName: string
  rowsInserted: number
  error?: string
}

export function ImportManager({ sourceId: _sourceId }: { sourceId?: number | null }) {
  const { theme } = useTheme()
  const cardBase = { background: theme.colors.bgCard, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, transition: theme.transitions.normal }
  const btnStyle = { padding: '8px 16px', borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}`, background: theme.colors.bgElevated, color: theme.colors.text, cursor: 'pointer', fontSize: '0.85rem', fontFamily: theme.fonts.body, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, transition: 'all 0.2s' } as const
  const btnPrimaryStyle = { ...btnStyle, background: theme.colors.gradient, color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(124,77,255,0.3)' } as const
  const tabStyle = { padding: '10px 20px', cursor: 'pointer', borderBottom: '2px solid transparent', fontSize: '0.9rem', fontWeight: 600, color: theme.colors.textMuted, transition: 'color 0.2s' }

  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import')
  const [step, setStep] = useState(1) // 1: Select Source, 2: Preview & Review, 3: Success

  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [schemaOverrides, setSchemaOverrides] = useState<Record<string, { columns: Array<{ name: string; type: string }> }>>({})
  
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null)

  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    loadSources()
  }, [])

  useEffect(() => {
    if (_sourceId) {
      setActiveTab('import')
      loadPreview(_sourceId)
    }
  }, [_sourceId])

  useEffect(() => {
    if (activeTab === 'history') loadHistory()
  }, [activeTab])

  const loadSources = () => {
    setLoading(true)
    api.dataSources.list().then(setSources).catch(console.error).finally(() => setLoading(false))
  }

  const loadHistory = () => {
    setHistoryLoading(true)
    api.importApi.history().then(setHistory).catch(console.error).finally(() => setHistoryLoading(false))
  }

  const handleUndo = async (id: number) => {
    if (!confirm('Tem certeza que deseja desfazer essa importação? Todas as linhas inseridas serão deletadas.')) return
    try {
      await api.importApi.undo(id)
      loadHistory()
      alert('Importação desfeita com sucesso!')
    } catch (e: any) {
      alert('Erro ao desfazer: ' + e.message)
    }
  }

  const loadPreview = async (sourceId: number) => {
    setStep(2)
    setPreviewLoading(true)
    setImportResults(null)
    setSelectedIndices([])
    setSchemaOverrides({})
    try {
      const data = await api.importApi.preview(sourceId)
      setPreview(data)
      setSelectedIndices(data.previews.map((_: any, i: number) => i))
    } catch (e: any) {
      alert('Erro ao carregar preview: ' + e.message)
      setStep(1)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSchemaChange = (fileIdx: number, colIdx: number, field: 'name' | 'type', value: string) => {
    setSchemaOverrides(prev => {
      const key = `edit_${fileIdx}`
      const file = preview?.previews[fileIdx]
      if (!file) return prev
      const current = prev[key] || { columns: file.schema.columns.map((c: any) => ({ name: c.name, type: c.type })) }
      const cols = [...current.columns] as any[]
      cols[colIdx] = { name: cols[colIdx]?.name || '', type: cols[colIdx]?.type || 'TEXT', [field]: value }
      return { ...prev, [key]: { columns: cols } } as any
    })
  }

  const handleImport = async () => {
    if (!preview) return
    setStep(3)
    setImporting(true)
    setImportResults(null)
    try {
      const overridesList = selectedIndices.map(idx => {
        const key = `edit_${idx}`;
        return schemaOverrides[key] ? { columns: schemaOverrides[key].columns } : null;
      });
      
      const result = await api.importApi.confirm(preview.sourceId, selectedIndices, overridesList);
      setImportResults(result.results)
    } catch (e: any) {
      alert('Erro ao importar: ' + e.message)
      setStep(2)
    } finally {
      setImporting(false)
    }
  }

  const getTypeIcon = (dataType: string) => {
    const icons: Record<string, string> = {
      contatos: '👥', calendario: '📅', orcamento: '💰', protocolo: '📋',
      fluxo: '🔀', relatorio: '📊', indicadores: '📈', cronograma: '🗓️',
      clipping: '📰',
    }
    return icons[dataType] || '📄'
  }

  const renderStepper = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, padding: '0 10px' }}>
      {[
        { num: 1, label: 'Origem de Dados' },
        { num: 2, label: 'Revisão & Schema' },
        { num: 3, label: 'Importação' }
      ].map((s) => (
        <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: s.num < 3 ? 1 : 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step >= s.num ? theme.colors.accent : theme.colors.bgElevated,
            color: step >= s.num ? 'white' : theme.colors.textMuted,
            fontWeight: 'bold', fontSize: '0.9rem',
            border: `2px solid ${step >= s.num ? theme.colors.accent : theme.colors.border}`,
            transition: 'all 0.3s'
          }}>
            {step > s.num ? '✓' : s.num}
          </div>
          <span style={{ marginLeft: 10, fontWeight: 600, color: step >= s.num ? theme.colors.text : theme.colors.textMuted, fontSize: '0.85rem' }}>
            {s.label}
          </span>
          {s.num < 3 && (
            <div style={{ flex: 1, height: 2, background: step > s.num ? theme.colors.accent : theme.colors.border, margin: '0 15px', transition: 'all 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.colors.border}`, gap: 20 }}>
        <div 
          style={{ ...tabStyle, borderBottomColor: activeTab === 'import' ? theme.colors.accent : 'transparent', color: activeTab === 'import' ? theme.colors.text : theme.colors.textMuted }}
          onClick={() => setActiveTab('import')}
        >
          ✨ Nova Importação
        </div>
        <div 
          style={{ ...tabStyle, borderBottomColor: activeTab === 'history' ? theme.colors.accent : 'transparent', color: activeTab === 'history' ? theme.colors.text : theme.colors.textMuted }}
          onClick={() => setActiveTab('history')}
        >
          🕒 Histórico & Desfazer
        </div>
      </div>

      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {historyLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: theme.colors.textMuted }}>Carregando histórico...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.colors.textMuted, ...cardBase }}>
              Nenhuma importação registrada no histórico.
            </div>
          ) : (
            history.map((h: any) => (
              <div key={h.id} style={{ ...cardBase, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📦</span>
                    Tabela: <span style={{ color: theme.colors.accent }}>{h.table_name}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: theme.colors.textSecondary, marginTop: 4 }}>
                    Fonte ID: {h.source_id} • Arquivo ID: {h.file_id}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: theme.colors.success, marginTop: 4, fontWeight: 500 }}>
                    +{h.rows_inserted} linhas inseridas em {new Date(h.imported_at).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => handleUndo(h.id)} style={{ ...btnStyle, color: theme.colors.danger, borderColor: `${theme.colors.danger}44` }}>
                  <Icons.XCircle size={14} /> Desfazer
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'import' && (
        <>
          {renderStepper()}

          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {loading ? (
                <div style={{ padding: 20, gridColumn: '1 / -1', textAlign: 'center' }}>Carregando fontes...</div>
              ) : sources.map(source => (
                <div key={source.id} onClick={() => source.type === 'documentos' && loadPreview(source.id)}
                  style={{ ...cardBase, padding: 20, cursor: source.type === 'documentos' ? 'pointer' : 'not-allowed', opacity: source.type === 'documentos' ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: '2rem' }}>{source.type === 'fotos' ? '📸' : '📄'}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: theme.colors.text }}>{source.label}</div>
                      <div style={{ fontSize: '0.75rem', color: theme.colors.textMuted }}>{source.path}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.8rem', color: theme.colors.accent, fontWeight: 600 }}>
                      {source.type === 'documentos' ? 'Selecionar Origem →' : 'Apenas Documentos'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: theme.colors.text }}>Revise os dados antes de importar</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: theme.colors.textSecondary }}>Selecione as abas e ajuste os tipos de colunas se necessário.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setStep(1)} style={btnStyle}>Voltar</button>
                  <button onClick={handleImport} style={btnPrimaryStyle} disabled={selectedIndices.length === 0}>
                    Importar Selecionados ({selectedIndices.length})
                  </button>
                </div>
              </div>

              {previewLoading ? (
                <div style={{ padding: 40, textAlign: 'center', ...cardBase }}>
                  <div className="spinner" style={{ margin: '0 auto 16px', width: 30, height: 30, border: `3px solid ${theme.colors.border}`, borderTopColor: theme.colors.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <div style={{ color: theme.colors.text }}>Lendo arquivos e analisando com IA...</div>
                </div>
              ) : preview?.previews.map((item, idx) => (
                <div key={idx} style={{ ...cardBase, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: selectedIndices.includes(idx) ? 'rgba(124,77,255,0.06)' : 'transparent', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <input type="checkbox" checked={selectedIndices.includes(idx)} onChange={() => setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])} style={{ accentColor: theme.colors.accent, cursor: 'pointer', width: 18, height: 18 }} />
                    <span style={{ fontSize: '1.5rem' }}>{getTypeIcon(item.schema.dataType)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: theme.colors.text, fontSize: '1rem' }}>{item.fileName}</div>
                      <div style={{ fontSize: '0.8rem', color: theme.colors.textMuted, marginTop: 2 }}>{item.rowCount} registros • Destino: {item.schema.tableName}</div>
                    </div>
                  </div>
                  
                  {selectedIndices.includes(idx) && (
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                        {(schemaOverrides[`edit_${idx}`]?.columns || item.schema.columns).map((col: any, cIdx: number) => (
                          <div key={cIdx} style={{ background: theme.colors.bgElevated, padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}` }}>
                            <div style={{ fontSize: '0.7rem', color: theme.colors.textMuted, marginBottom: 4 }}>Nome da Coluna</div>
                            <input value={col.name} onChange={e => handleSchemaChange(idx, cIdx, 'name', e.target.value)} style={{ width: '100%', padding: '4px 8px', background: 'transparent', border: `1px solid ${theme.colors.border}`, color: theme.colors.text, borderRadius: 4, marginBottom: 8, fontSize: '0.85rem' }} />
                            
                            <div style={{ fontSize: '0.7rem', color: theme.colors.textMuted, marginBottom: 4 }}>Tipo de Dado</div>
                            <select value={col.type} onChange={e => handleSchemaChange(idx, cIdx, 'type', e.target.value)} style={{ width: '100%', padding: '4px 8px', background: 'transparent', border: `1px solid ${theme.colors.border}`, color: theme.colors.accent, borderRadius: 4, fontSize: '0.85rem', fontWeight: 600 }}>
                              <option value="TEXT">Texto</option>
                              <option value="INTEGER">Número Inteiro</option>
                              <option value="REAL">Número Decimal</option>
                              <option value="DATE">Data</option>
                              <option value="BOOLEAN">Booleano</option>
                              <option value="CPF">CPF</option>
                              <option value="CNPJ">CNPJ</option>
                              <option value="EMAIL">E-mail</option>
                              <option value="PHONE">Telefone</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div style={{ ...cardBase, padding: 40, textAlign: 'center' }}>
              {importing ? (
                 <div>
                   <div className="spinner" style={{ margin: '0 auto 24px', width: 40, height: 40, border: `4px solid ${theme.colors.border}`, borderTopColor: theme.colors.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                   <h2 style={{ margin: 0, color: theme.colors.text }}>Importando e Deduplicando...</h2>
                   <p style={{ color: theme.colors.textMuted }}>O sistema está gerando hashes MD5 para evitar linhas duplicadas.</p>
                 </div>
              ) : (
                <div>
                  <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
                  <h2 style={{ margin: 0, color: theme.colors.text }}>Importação Concluída!</h2>
                  
                  <div style={{ maxWidth: 500, margin: '24px auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {importResults?.map((r, i) => (
                      <div key={i} style={{ padding: '12px 16px', borderRadius: theme.radius.sm, background: r.success ? 'rgba(0,200,83,0.05)' : 'rgba(255,23,68,0.05)', border: `1px solid ${r.success ? theme.colors.success : theme.colors.danger}33`, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '1.2rem' }}>{r.success ? '✅' : '❌'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: theme.colors.text, fontSize: '0.9rem' }}>{r.fileName}</div>
                          <div style={{ fontSize: '0.8rem', color: r.success ? theme.colors.success : theme.colors.danger, marginTop: 2 }}>
                            {r.success ? `${r.rowsInserted} linhas importadas em ${r.tableName}` : r.error}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32 }}>
                    <button onClick={() => setStep(1)} style={btnStyle}>Nova Importação</button>
                    <button onClick={() => setActiveTab('history')} style={btnPrimaryStyle}>Ver Histórico</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
