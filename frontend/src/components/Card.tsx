import { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  hover?: boolean
  children: ReactNode
}

const sizes = { sm: 'card-sm', md: '', lg: 'card-lg' }

export function Card({ size = 'md', className = '', children, ...props }: CardProps) {
  const cls = ['card', sizes[size], className].filter(Boolean).join(' ')
  return (
    <div className={cls} {...props}>
      {children}
    </div>
  )
}
