import { memo } from 'react'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  icon: LucideIcon
  color: string
}

export const KpiCard = memo(function KpiCard({ label, value, icon: Icon, color }: KpiCardProps) {
  return (
    <div className="card card-hover-lift" style={{ padding: '14px 16px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span className="text-caption">{label}</span>
        <Icon size={14} style={{ color, opacity: 0.6 }} />
      </div>
      <div className="stat-value" style={{ color, lineHeight: 1.1 }}>{value}</div>
    </div>
  )
})
