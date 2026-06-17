import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  buttonSize?: 'sm' | 'md' | 'lg'
  icon?: boolean
  children: ReactNode
}

const variants = { primary: 'btn--primary', secondary: 'btn--secondary', ghost: 'btn--ghost' }
const sizes = { sm: 'btn--sm', md: '', lg: 'btn--lg' }

export function Button({ variant = 'primary', buttonSize = 'md', icon, className = '', children, ...props }: ButtonProps) {
  const cls = [
    'btn',
    variants[variant],
    sizes[buttonSize],
    icon && 'btn--icon',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={cls} {...props}>
      {children}
    </button>
  )
}
