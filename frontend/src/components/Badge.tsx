import { ReactNode } from 'react'

type BadgeColor =
  | 'crises' | 'fluxos' | 'portavozes' | 'calendario'
  | 'sensiveis' | 'relatorios' | 'normativos' | 'campanhas'
  | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  color?: BadgeColor
  children: ReactNode
  className?: string
}

export function Badge({ color = 'info', children, className = '' }: BadgeProps) {
  const cls = ['badge', `badge--${color}`, className].filter(Boolean).join(' ')
  return <span className={cls}>{children}</span>
}
