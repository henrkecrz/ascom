import { InputHTMLAttributes } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'input--sm', md: '', lg: 'input--lg' }

export function Input({ inputSize = 'md', className = '', ...props }: InputProps) {
  const cls = ['input', sizes[inputSize], className].filter(Boolean).join(' ')
  return <input className={cls} {...props} />
}
