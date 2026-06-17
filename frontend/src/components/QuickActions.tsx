import { memo } from 'react'
import { LucideIcon, ChevronRight } from 'lucide-react'

interface QuickAction {
  label: string
  icon: LucideIcon
  page: string
}

interface QuickActionsProps {
  actions: QuickAction[]
  onNavigate: (page: string) => void
}

const ActionButton = memo(function ActionButton({ action, onNavigate }: { action: QuickAction; onNavigate: (page: string) => void }) {
  const Icon = action.icon
  return (
    <button onClick={() => onNavigate(action.page)}
      className="flex items-center gap-xs cursor-pointer"
      style={{
        padding: '7px 14px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      <Icon size={13} />
      {action.label}
      <ChevronRight size={12} style={{ opacity: 0.4 }} />
    </button>
  )
})

export function QuickActions({ actions, onNavigate }: QuickActionsProps) {
  return (
    <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ações rápidas</h3>
      <div className="flex" style={{ flexWrap: 'wrap', gap: 8 }}>
        {actions.map(a => (
          <ActionButton key={a.label} action={a} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}
