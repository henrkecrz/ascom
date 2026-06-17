import { useState, useEffect, useRef } from 'react'
import { theme, gradientText } from '../theme'
import { API_BASE as API } from '../api'

interface GraphNode { id: number; label: string; extension: string; category: string; size: string }
interface GraphEdge { from: number; to: number; value: number; title: string }
interface GraphData { nodes: GraphNode[]; edges: GraphEdge[] }

interface Props { onSelectDoc: (id: number) => void }

export function GraphView({ onSelectDoc }: Props) {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ name: string; color: string; count: number }[]>([])
  const [physicsEnabled, setPhysicsEnabled] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<any>(null)

  const getCategoryColor = (category: string | undefined | null): string => {
    const cat = (category || '').toLowerCase()
    if (cat.includes('crise') || cat.includes('crisis')) return '#ef4444'
    if (cat.includes('fluxo')) return '#3b82f6'
    if (cat.includes('porta') || cat.includes('voz')) return '#8b5cf6'
    if (cat.includes('calendario') || cat.includes('agenda')) return '#10b981'
    if (cat.includes('sensivel') || cat.includes('sensíveis')) return '#f59e0b'
    if (cat.includes('relatorio') || cat.includes('relatório')) return '#06b6d4'
    if (cat.includes('normat') || cat.includes('diretriz')) return '#ec4899'
    if (cat.includes('campanha') || cat.includes('material')) return '#f97316'
    return '#7c4dff'
  }

  useEffect(() => {
    fetch(`${API}/api/graph`).then(r => r.json()).then((data: GraphData) => {
      setGraphData(data)
      const catsMap: Record<string, number> = {}
      ;(data.nodes || []).forEach(n => {
        const c = n.category || 'Outros'
        catsMap[c] = (catsMap[c] || 0) + 1
      })
      const mappedCats = Object.keys(catsMap).map(name => ({
        name,
        color: getCategoryColor(name),
        count: catsMap[name]!
      })).sort((a, b) => b.count - a.count)
      setCategories(mappedCats)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!graphData || !containerRef.current) return

    const loadVis = async () => {
      const visNetwork = await import('vis-network')
      const visData = await import('vis-data')
      const { Network } = visNetwork
      const { DataSet } = visData

      let filteredNodes = graphData.nodes || []
      let filteredEdges = graphData.edges || []

      if (selectedCategory) {
        const ids = new Set(filteredNodes.filter(n => (n.category || 'Outros') === selectedCategory).map(n => n.id))
        filteredEdges = filteredEdges.filter(e => ids.has(e.from) && ids.has(e.to))
        filteredNodes = filteredNodes.filter(n => ids.has(n.id))
      }

      const edgeCounts: Record<number, number> = {}
      for (const e of filteredEdges) {
        edgeCounts[e.from] = (edgeCounts[e.from] || 0) + 1
        edgeCounts[e.to] = (edgeCounts[e.to] || 0) + 1
      }

      const nodeData: any[] = filteredNodes.map(n => {
        const color = getCategoryColor(n.category)
        const safeLabel = n.label || 'Documento sem nome'
        const safeCat = n.category || 'Outros'
        const safeSize = n.size || '-'
        
        // Custom HTML element for Tooltip
        const tooltipEl = document.createElement('div')
        tooltipEl.style.pointerEvents = 'none'
        tooltipEl.innerHTML = `
          <div style="background: rgba(18, 18, 31, 0.96); border: 1px solid var(--border-subtle); color: #fff; padding: 12px; border-radius: 8px; font-family: sans-serif; font-size: 0.75rem; box-shadow: 0 8px 24px rgba(0,0,0,0.5); backdrop-filter: blur(8px); width: 220px;">
            <strong style="color: ${color}; font-size: 0.82rem; display: block; margin-bottom: 6px; word-break: break-all;">${safeLabel}</strong>
            <div style="margin-bottom: 3px; display: flex; justify-content: space-between;"><span style="color: #8888a0;">Categoria:</span> <span>${safeCat}</span></div>
            <div style="margin-bottom: 3px; display: flex; justify-content: space-between;"><span style="color: #8888a0;">Tamanho:</span> <span>${safeSize}</span></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: #8888a0;">Conexões:</span> <span>${edgeCounts[n.id] || 0}</span></div>
          </div>
        `

        return {
          id: n.id,
          label: safeLabel.length > 20 ? safeLabel.substring(0, 18) + '…' : safeLabel,
          title: tooltipEl,
          color: {
            background: color,
            border: color,
            highlight: { background: color, border: '#fff' }
          },
          size: 10 + Math.min(Math.max(edgeCounts[n.id] || 1, 1), 12) * 2.2,
          font: { size: 10, color: 'var(--text-secondary)', face: 'Inter' },
          borderWidth: 2,
        }
      })

      const maxVal = Math.max(...filteredEdges.map(e => e.value), 0.01)
      const edgeData: any[] = filteredEdges.map(e => ({
        from: e.from, to: e.to,
        value: e.value,
        title: `${(e.value * 100).toFixed(0)}% similaridade`,
        color: {
          color: 'var(--border-subtle)',
          opacity: Math.min((e.value / maxVal) * 0.5 + 0.15, 0.7),
          highlight: 'var(--color-accent)'
        },
        width: Math.max((e.value / maxVal) * 4, 0.5),
      }))

      const nodes = new DataSet(nodeData)
      const edges = new DataSet(edgeData)

      const options = {
        physics: {
          enabled: physicsEnabled,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: { gravitationalConstant: -80, springLength: 100, springConstant: 0.015, damping: 0.5 },
          stabilization: { iterations: 150 },
        },
        interaction: { hover: true, tooltipDelay: 100, zoomView: true, dragView: true },
        edges: { smooth: { enabled: true, type: 'continuous', roundness: 0.5 } },
        nodes: { shape: 'dot' as const },
        background: { color: 'transparent' },
      }

      const network = new Network(containerRef.current!, { nodes, edges }, options)
      networkRef.current = network
      network.on('click', (params: any) => {
        if (params.nodes?.length > 0) onSelectDoc(params.nodes[0])
      })
    }

    loadVis()
    return () => { networkRef.current?.destroy(); networkRef.current = null }
  }, [graphData, selectedCategory, onSelectDoc, physicsEnabled])

  const handleZoom = (scaleMultiplier: number) => {
    if (!networkRef.current) return
    const currentScale = networkRef.current.getScale()
    networkRef.current.moveTo({
      scale: currentScale * scaleMultiplier,
      animation: { duration: 300, easingFunction: 'easeInOutQuad' }
    })
  }

  const handleFit = () => {
    if (networkRef.current) {
      networkRef.current.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...gradientText, margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Grafo de Conexões</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Mapeamento visual e interativo das similaridades e relações entre as diretrizes do plano
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        
        {/* Left: Network Canvas */}
        <div style={{ position: 'relative' }}>
          <div
            ref={containerRef}
            style={{
              width: '100%', height: 'calc(100vh - 220px)',
              background: 'var(--bg-surface)',
              borderRadius: theme.radius.lg,
              border: '1px solid var(--border-subtle)',
              minHeight: 450,
              overflow: 'hidden',
            }}
          />

          {/* Floating Action Controls */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            display: 'flex', gap: 6, padding: 4,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: theme.radius.md,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            zIndex: 10
          }}>
            <button onClick={() => handleZoom(1.3)} className="btn-floating" title="Aumentar Zoom">+</button>
            <button onClick={() => handleZoom(0.7)} className="btn-floating" title="Diminuir Zoom">-</button>
            <button onClick={handleFit} className="btn-floating" title="Centralizar Grafo">⛶</button>
            <button onClick={() => setPhysicsEnabled(!physicsEnabled)}
              className="btn-floating"
              style={{ color: physicsEnabled ? 'var(--color-success)' : 'var(--text-muted)' }}
              title={physicsEnabled ? 'Congelar Física' : 'Ativar Física'}>
              ⚓
            </button>
          </div>
        </div>

        {/* Right: Legend Panel */}
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 18, height: 'calc(100vh - 220px)', minHeight: 450, overflowY: 'auto' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            Categorias do Plano
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <button onClick={() => setSelectedCategory(null)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: theme.radius.sm, border: `1px solid ${!selectedCategory ? 'var(--color-accent)' : 'var(--border-subtle)'}`,
                background: !selectedCategory ? 'var(--color-accent-glow)' : 'var(--bg-hover)',
                color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: !selectedCategory ? 600 : 400,
                textAlign: 'left', transition: 'all 0.2s ease'
              }}>
              <span>Ver todas as áreas</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{(graphData?.nodes || []).length} docs</span>
            </button>

            {categories.map(cat => {
              const active = selectedCategory === cat.name
              return (
                <button key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: theme.radius.sm, border: `1px solid ${active ? cat.color : 'transparent'}`,
                    background: active ? `${cat.color}15` : 'var(--bg-hover)',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: active ? 600 : 400,
                    textAlign: 'left', transition: 'all 0.2s ease',
                    opacity: selectedCategory && !active ? 0.4 : 1
                  }}
                  onMouseEnter={e => { if(!active) e.currentTarget.style.borderColor = cat.color }}
                  onMouseLeave={e => { if(!active) e.currentTarget.style.borderColor = 'transparent' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{cat.count}</span>
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.5, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            • Role o mouse para aproximar ou afastar.<br />
            • Arraste o nó para organizar a física.<br />
            • Clique em um documento para abrir seus metadados.
          </div>
        </div>

      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          Carregando rede de conexões...
        </div>
      )}
    </div>
  )
}


