import { memo } from 'react'
import { Phone } from 'lucide-react'

interface Spokesperson { id: number; name: string; persons: string[]; summary: string }

const SpokespersonItem = memo(function SpokespersonItem({ s }: { s: Spokesperson }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.name}</div>
      {s.persons.length > 0 && (
        <div style={{ fontSize: '0.72rem', color: 'oklch(58% 0.14 280)', marginTop: 2 }}>{s.persons.join(', ')}</div>
      )}
    </div>
  )
})

export function CrisisSpokespersons({ spokespersons }: { spokespersons: Spokesperson[] }) {
  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="flex items-center gap-xs" style={{ marginBottom: 12 }}>
        <Phone size={14} style={{ color: 'var(--text-muted)' }} />
        <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600 }}>Porta-Vozes ({spokespersons.length})</h3>
      </div>
      {spokespersons.length === 0 ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nenhum porta-voz registrado.</div>
      ) : (
        <div className="flex flex-col" style={{ gap: 6 }}>
          {spokespersons.map(s => (
            <SpokespersonItem key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  )
}
