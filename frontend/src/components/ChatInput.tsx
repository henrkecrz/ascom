import { memo, useCallback } from 'react'
import { Send, X } from 'lucide-react'

interface ChatInputProps {
  input: string
  loading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClear: () => void
}

const accent = 'oklch(58% 0.16 255)'

export const ChatInput = memo(function ChatInput({ input, loading, onInputChange, onSubmit, onClear }: ChatInputProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onInputChange(e.target.value), [onInputChange])

  return (
    <form onSubmit={onSubmit} className="flex gap-xs" style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
      <div className="flex items-center" style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0 10px' }}>
        <input value={input} onChange={handleChange} placeholder="Digite sua pergunta..."
          className="premium-input"
          style={{ flex: 1, border: 'none', padding: '9px 4px' }} />
        {input && (
          <button type="button" onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>
      <button type="submit" disabled={loading || !input.trim()}
        style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)',
          background: input.trim() ? accent : 'var(--border-subtle)',
          border: 'none', cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'all 0.15s',
        }}>
        <Send size={14} style={{ color: input.trim() ? '#fff' : 'var(--text-muted)' }} />
      </button>
    </form>
  )
})
