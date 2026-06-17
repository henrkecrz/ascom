import { useState, useCallback, useRef, useEffect } from 'react'
import { ChatMessage } from '../api'
import { MessageSquare, Sparkles, Plus, Download } from 'lucide-react'
import { MessageBubble } from '../components/MessageBubble'
import { ChatInput } from '../components/ChatInput'
import { useQuickQuestions, useAskQuestion } from '../hooks/useApi'



interface Props { onSelectDoc?: (id: number) => void }

const accent = 'oklch(58% 0.16 255)'

export function ConsultChat({ onSelectDoc }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Olá! Faça uma pergunta sobre o Plano de Comunicação da Novacap. Posso ajudar com protocolos, calendário, porta-vozes e muito mais.' },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const askMutation = useAskQuestion()
  const { data: quickQuestionsData } = useQuickQuestions()

  const quickQuestions = quickQuestionsData?.questions ?? []

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ask = useCallback(async (question: string) => {
    if (!question.trim() || askMutation.isPending) return
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setInput('')
    try {
      const data = await askMutation.mutateAsync(question)
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer, documents: data.documents, source: data.source }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Desculpe, ocorreu um erro ao processar sua pergunta.' }])
    }
  }, [askMutation])

  const handleSubmit = useCallback((e: React.FormEvent) => { e.preventDefault(); ask(input) }, [ask, input])
  const handleClear = useCallback(() => setInput(''), [])
  const handleInputChange = useCallback((value: string) => setInput(value), [])

  const openPreview = useCallback((id: number) => {
    if (onSelectDoc) onSelectDoc(id)
  }, [onSelectDoc])

  const downloadHistory = () => {
    const now = new Date()
    const timestamp = now.toLocaleString('pt-BR')
    let content = `=== Histórico de Consulta Inteligente ===\n`
    content += `Exportado em: ${timestamp}\n`
    content += `${'='.repeat(45)}\n\n`
    messages.forEach((msg, i) => {
      if (i === 0 && msg.role === 'assistant') return // skip greeting
      const label = msg.role === 'user' ? '👤 PERGUNTA' : '🤖 RESPOSTA'
      content += `${label}:\n${msg.text}\n`
      if (msg.source) content += `[Fonte: ${msg.source}]\n`
      if (msg.documents && msg.documents.length > 0) {
        content += `[Documentos: ${msg.documents.map(d => d.name).join(', ')}]\n`
      }
      content += `\n${'─'.repeat(40)}\n\n`
    })
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consulta_${now.toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="chat-layout">
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={20} style={{ color: accent }} />
              Consulta Inteligente
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Pergunte em linguagem natural sobre o Plano de Comunicação
            </p>
          </div>
          {messages.length > 1 && (
            <button onClick={downloadHistory} title="Baixar histórico da conversa"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <Download size={13} />
              Baixar .txt
            </button>
          )}
        </div>
      </div>

      {quickQuestions.length > 0 && messages.length <= 1 && (
        <div style={{ marginBottom: 12, flexShrink: 0 }}>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {quickQuestions.map((q, i) => (
              <button key={i} onClick={() => ask(q.question)}
                className="flex items-center gap-xs"
                style={{
                  padding: '6px 12px', borderRadius: 99, background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <Plus size={11} />
                {q.question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: 0 }}>
        <div className="flex flex-col flex-1" style={{ overflowY: 'auto', padding: '16px 20px', gap: 12 }}>
          {messages.length <= 1 && (
            <div className="text-center" style={{ padding: '40px 20px', margin: 'auto' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Sparkles size={20} style={{ color: accent }} />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>O que você quer saber?</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}>
                Pergunte sobre protocolos de crise, prazos do calendário, porta-vozes, documentos ou qualquer assunto do plano.
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} onOpenPreview={openPreview} />
          ))}
          {askMutation.isPending && (
            <div className="flex gap-xs" style={{ padding: 10, alignSelf: 'flex-start' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, animation: 'pulse 0.8s infinite', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <ChatInput input={input} loading={askMutation.isPending} onInputChange={handleInputChange} onSubmit={handleSubmit} onClear={handleClear} />
      </div>

      <div className="text-center" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 6 }}>
        Respostas baseadas nos documentos indexados. Fontes consultadas são exibidas junto à resposta.
      </div>
    </div>
  )
}
