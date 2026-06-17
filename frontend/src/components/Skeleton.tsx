import { useTheme } from '../ThemeContext'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const { theme: t } = useTheme()
  return (
    <div style={{
      width, height, borderRadius,
      background: `linear-gradient(90deg, ${t.colors.bgElevated} 25%, ${t.colors.bgCard} 50%, ${t.colors.bgElevated} 75%)`,
      backgroundSize: '200px 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      ...style,
    }} />
  )
}

export function CardSkeleton() {
  const { theme: t } = useTheme()
  return (
    <div style={{
      background: t.colors.bgCard, borderRadius: t.radius.lg,
      border: `1px solid ${t.colors.border}`, padding: 20,
    }}>
      <Skeleton width="60%" height={18} style={{ marginBottom: 12 }} />
      <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={12} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton height={32} borderRadius={8} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={28} borderRadius={6} style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  )
}
