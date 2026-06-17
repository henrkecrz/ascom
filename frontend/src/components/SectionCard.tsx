import { memo } from 'react'
import { LucideIcon } from 'lucide-react'

interface SectionCardProps {
  label: string
  desc: string
  color: string
  bg: string
  page: string
  icon: LucideIcon
  onNavigate: (page: string) => void
}

export const SectionCard = memo(function SectionCard({ label, desc, color, bg, page, icon: Icon, onNavigate }: SectionCardProps) {
  return (
    <div onClick={() => onNavigate(page)}
      className="card card-hover-lift cursor-pointer"
      style={{ padding: '16px', transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s' }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{desc}</div>
    </div>
  )
})
