import { Component, ErrorInfo, ReactNode } from 'react'
import { useTheme } from '../ThemeContext'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />
    }
    return this.props.children
  }
}

function ErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const { theme: t } = useTheme()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 40, textAlign: 'center', fontFamily: t.fonts.body,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', marginBottom: 16,
      }}>!</div>
      <h3 style={{ margin: '0 0 8px', color: t.colors.text, fontSize: '1rem', fontWeight: 600 }}>
        Algo deu errado
      </h3>
      <p style={{ margin: '0 0 16px', color: t.colors.textMuted, fontSize: '0.8rem', maxWidth: 400 }}>
        {error?.message || 'Erro inesperado ao carregar esta seção'}
      </p>
      <button onClick={onRetry} style={{
        padding: '8px 20px', borderRadius: t.radius.sm,
        background: t.colors.gradient, color: 'white', border: 'none',
        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
        fontFamily: t.fonts.body,
      }}>Tentar novamente</button>
    </div>
  )
}
