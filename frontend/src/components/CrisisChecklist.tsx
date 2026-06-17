import { memo } from 'react'
import { ListChecks } from 'lucide-react'

interface ChecklistItem { order: number; step: string; status: string }

interface CrisisChecklistProps {
  checklist: ChecklistItem[]
  checkedSteps: Record<string, boolean>
  crisisMode: boolean
  onToggle: (order: number) => void
}

const crisisColor = 'oklch(58% 0.19 30)'
const accent = 'oklch(58% 0.16 255)'

const ChecklistRow = memo(function ChecklistRow({ item, checked, crisisMode, onToggle }: { item: ChecklistItem; checked: boolean; crisisMode: boolean; onToggle: (order: number) => void }) {
  return (
    <label className="flex items-center gap-xs cursor-pointer" style={{
      padding: '8px 10px', background: checked ? 'oklch(58% 0.15 145 / 0.03)' : 'transparent',
      borderRadius: 'var(--radius-sm)', border: `1px solid ${checked ? 'oklch(58% 0.15 145 / 0.19)' : 'transparent'}`, transition: 'all 0.15s',
    }}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(item.order)}
        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: crisisMode ? crisisColor : accent }} />
      <span style={{
        fontSize: crisisMode ? '0.85rem' : '0.78rem',
        color: checked ? 'var(--text-muted)' : 'var(--text-secondary)',
        textDecoration: checked ? 'line-through' : 'none', transition: 'all 0.15s',
      }}>
        {item.step}
      </span>
    </label>
  )
})

export function CrisisChecklist({ checklist, checkedSteps, crisisMode, onToggle }: CrisisChecklistProps) {
  const checkedCount = Object.values(checkedSteps).filter(Boolean).length
  const totalSteps = checklist.length
  const progressPct = totalSteps > 0 ? (checkedCount / totalSteps) * 100 : 0

  return (
    <div className="card" style={{ padding: '16px', borderColor: crisisMode ? `${crisisColor}30` : undefined, transition: 'border 0.3s' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div className="flex items-center gap-xs">
          <ListChecks size={14} style={{ color: crisisMode ? crisisColor : 'var(--text-muted)' }} />
          <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600 }}>Checklist</h3>
        </div>
        {totalSteps > 0 && (
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{checkedCount}/{totalSteps}</span>
        )}
      </div>
      {totalSteps > 0 && (
        <div style={{ width: '100%', height: 4, background: 'var(--border-subtle)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct === 100 ? 'var(--color-success)' : crisisMode ? crisisColor : accent, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      )}
      <div className="flex flex-col" style={{ gap: 4 }}>
        {checklist.map(item => (
          <ChecklistRow key={item.order} item={item} checked={!!checkedSteps[item.order]} crisisMode={crisisMode} onToggle={onToggle} />
        ))}
      </div>
      {checklist.length === 0 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nenhum item no checklist.</div>
      )}
    </div>
  )
}
