import { memo } from 'react'
import { FileText } from 'lucide-react'

interface Protocol { id: number; name: string; summary: string; keywords: string; lastModified: string }

interface CrisisProtocolsProps {
  protocols: Protocol[]
  crisisMode: boolean
  onSelectDoc: (id: number) => void
}

const crisisColor = 'oklch(58% 0.19 30)'

const ProtocolItem = memo(function ProtocolItem({ p, crisisMode, onSelectDoc }: { p: Protocol; crisisMode: boolean; onSelectDoc: (id: number) => void }) {
  return (
    <div onClick={() => onSelectDoc(p.id)}
      className="cursor-pointer"
      style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', transition: 'all 0.15s' }}
    >
      <div style={{ fontSize: crisisMode ? '0.95rem' : '0.82rem', fontWeight: 600, marginBottom: 3 }}>{p.name}</div>
      <div style={{ fontSize: crisisMode ? '0.85rem' : '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {p.summary?.substring(0, crisisMode ? 250 : 100)}{p.summary?.length > 100 ? '...' : ''}
      </div>
    </div>
  )
})

export function CrisisProtocols({ protocols, crisisMode, onSelectDoc }: CrisisProtocolsProps) {
  return (
    <div className="card" style={{ padding: '16px', borderColor: crisisMode ? `${crisisColor}30` : undefined, transition: 'border 0.3s' }}>
      <div className="flex items-center gap-xs" style={{ marginBottom: 12 }}>
        <FileText size={14} style={{ color: crisisMode ? crisisColor : 'var(--text-muted)' }} />
        <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600 }}>Protocolos de Ação ({protocols.length})</h3>
      </div>
      {protocols.length === 0 ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: 12 }}>Nenhum protocolo cadastrado.</div>
      ) : (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {protocols.map(p => (
            <ProtocolItem key={p.id} p={p} crisisMode={crisisMode} onSelectDoc={onSelectDoc} />
          ))}
        </div>
      )}
    </div>
  )
}
