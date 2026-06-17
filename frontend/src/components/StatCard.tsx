import { memo } from 'react'

interface StatCardProps {
  label: string
  value: string
  gradient: string
}

export const StatCard = memo(function StatCard({ label, value, gradient }: StatCardProps) {
  return (
    <div className="card relative overflow-hidden" style={{ padding: '18px 20px' }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: 40, background: gradient, opacity: 0.08,
      }} />
      <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <p className="text-caption">{label}</p>
          <p className="stat-value-gradient">{value}</p>
        </div>
      </div>
    </div>
  )
})
