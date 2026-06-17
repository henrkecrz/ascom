import { useState, useEffect } from 'react'
import { api } from '../api'

interface CurrentItem {
  id: number
  file_id: number
  stage: string
  file_name: string
}

const STAGE_LABELS: Record<string, string> = {
  extract: 'Extraindo texto',
  analyze: 'Analisando com IA',
  structure: 'Extraindo estrutura',
  relations: 'Computando similaridades',
  clusters: 'Gerando clusters',
  knowledge: 'Construindo grafo',
}

export function ProcessingToast() {
  const [current, setCurrent] = useState<CurrentItem | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const item = await api.queue.current()
        if (item) {
          setCurrent(item)
          setVisible(true)
        } else {
          setVisible(false)
          setTimeout(() => setCurrent(null), 500)
        }
      } catch {
        setVisible(false)
      }
    }, 2000)
    return () => clearInterval(poll)
  }, [])

  if (!current && !visible) return null

  return (
    <div
      className="processing-toast"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 380,
        background: '#1a1a2e',
        border: '1px solid #2a2a4a',
        borderRadius: 10,
        padding: '14px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="processing-spinner" style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '3px solid #2a2a4a',
          borderTopColor: '#7c4dff',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#7c4dff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {current ? STAGE_LABELS[current.stage] || current.stage : 'Processando...'}
          </div>
          <div style={{
            fontSize: '0.82rem',
            fontWeight: 500,
            color: '#e0e0e0',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {current?.file_name || '...'}
          </div>
        </div>
      </div>
    </div>
  )
}
