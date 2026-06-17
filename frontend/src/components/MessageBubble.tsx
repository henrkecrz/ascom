import { memo, useState } from 'react'
import { Bot, User, FileText, ChevronRight, Copy, Check } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  documents?: { id: number; name: string; docType: string; summary: string; planSection: string }[]
  source?: string
}

interface MessageBubbleProps {
  msg: ChatMessage
  onOpenPreview: (id: number) => void
}

const accent = 'oklch(58% 0.16 255)'

export const MessageBubble = memo(function MessageBubble({ msg, onOpenPreview }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col" style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeInUp 0.25s ease-out' }}>
      <div className="flex gap-xs" style={{ maxWidth: '80%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: msg.role === 'user' ? accent : 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
        }}>
          {msg.role === 'user' ? <User size={12} style={{ color: '#fff' }} /> : <Bot size={12} style={{ color: 'var(--text-muted)' }} />}
        </div>
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: msg.role === 'user' ? accent : 'var(--bg-elevated)',
          color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
          fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
          borderBottomRightRadius: msg.role === 'user' ? 2 : undefined,
          borderBottomLeftRadius: msg.role === 'assistant' ? 2 : undefined,
          position: 'relative' as const,
        }}>
          {msg.text}
          {msg.role === 'assistant' && (
            <button onClick={handleCopy} title={copied ? 'Copiado!' : 'Copiar resposta'}
              style={{
                position: 'absolute', top: 6, right: 6,
                background: copied ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(0, 200, 83, 0.3)' : 'var(--border-subtle)'}`,
                borderRadius: 6, padding: 4, cursor: 'pointer',
                color: copied ? '#00c853' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease', opacity: 0.6,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>
      {msg.documents && msg.documents.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 6, maxWidth: '80%', marginLeft: 34 }}>
          {msg.documents.slice(0, 3).map(d => (
            <div key={d.id} onClick={() => onOpenPreview(d.id)}
              className="flex items-center gap-xs cursor-pointer"
              style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.68rem', transition: 'all 0.15s' }}>
              <FileText size={11} style={{ color: accent }} />
              <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
              <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
      )}
      {msg.role === 'assistant' && msg.source && (
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2, marginLeft: 34 }}>{msg.source}</div>
      )}
    </div>
  )
})
