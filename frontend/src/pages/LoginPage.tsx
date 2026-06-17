import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import { api } from '../api'

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const { theme: t } = useTheme()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.login(password)
      onLogin()
    } catch (e: any) {
      setError(e?.message || 'Senha incorreta')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: t.colors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: t.fonts.body,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: t.colors.bgCard, borderRadius: t.radius.lg,
        padding: 40, width: 360, maxWidth: '90vw',
        border: `1px solid ${t.colors.border}`,
        boxShadow: t.shadows.md,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: t.colors.gradient, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', fontWeight: 700, color: 'white',
          margin: '0 auto 20px',
        }}>PC</div>

        <h1 style={{
          fontSize: '1.1rem', fontWeight: 700, color: t.colors.text,
          textAlign: 'center', margin: '0 0 4px',
        }}>Plano de Comunicação</h1>
        <p style={{
          fontSize: '0.75rem', color: t.colors.textMuted,
          textAlign: 'center', margin: '0 0 24px',
        }}>NOVACAP · ASCOM</p>

        <input type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Senha de acesso"
          autoFocus
          aria-label="Senha de acesso"
          style={{
            width: '100%', padding: '12px 16px', marginBottom: 16,
            background: t.colors.bgElevated, border: `1px solid ${t.colors.border}`,
            borderRadius: t.radius.sm, color: t.colors.text,
            fontSize: '0.9rem', fontFamily: t.fonts.body,
            outline: 'none', boxSizing: 'border-box',
          }} />

        {error && <p role="alert" style={{
          fontSize: '0.78rem', color: '#ef4444', margin: '0 0 12px', textAlign: 'center',
        }}>{error}</p>}

        <button type="submit" disabled={loading} aria-label={loading ? 'Entrando...' : 'Entrar'} style={{
          width: '100%', padding: '12px', borderRadius: t.radius.sm,
          background: t.colors.gradient, color: 'white', border: 'none',
          fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
          fontFamily: t.fonts.body, opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
