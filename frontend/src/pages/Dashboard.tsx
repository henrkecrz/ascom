import { useMemo, memo, useCallback } from 'react'
import { api } from '../api'
import { StatCard } from '../components/StatCard'
import { RecentFiles } from '../components/RecentFiles'
import { useDashboardStats, useQueueStatus } from '../hooks/useApi'

interface Props {
  onSelectDoc: (id: number) => void
}

export function Dashboard({ onSelectDoc }: Props) {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: queueStatus } = useQueueStatus()

  const topCategories = useMemo(() => {
    if (!stats) return []
    return stats.categories.slice(0, 10)
  }, [stats])

  const maxCatCount = useMemo(() => {
    return Math.max(...topCategories.map(c => c.count), 1)
  }, [topCategories])

  const totalMB = useMemo(() => {
    if (!stats) return '0.0'
    return (stats.totalSize / (1024 * 1024)).toFixed(1)
  }, [stats])

  const statsCards = useMemo(() => {
    if (!stats) return []
    return [
      { label: 'Arquivos Indexados', value: String(stats.totalFiles), gradient: 'linear-gradient(135deg, #7c4dff, #536dfe)' },
      { label: 'Tamanho Total', value: `${totalMB} MB`, gradient: 'linear-gradient(135deg, #00c853, #69f0ae)' },
      { label: 'Textos Extraídos', value: String(stats.extractedCount), gradient: 'linear-gradient(135deg, #ff9100, #ffd740)' },
      { label: 'Conexões', value: String(stats.relationCount), gradient: 'linear-gradient(135deg, #ff1744, #ff6e40)' },
      { label: 'Clusters', value: String(stats.clusterCount), gradient: 'linear-gradient(135deg, #00b8d4, #84ffff)' },
    ]
  }, [stats, totalMB])

  const handleSelectDoc = useCallback((id: number) => onSelectDoc(id), [onSelectDoc])

  if (isLoading) return <DashboardSkeleton />
  if (!stats) return <div className="text-center" style={{ padding: 60, color: 'var(--text-muted)' }}>Erro ao carregar dados</div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="gradient-text" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Dashboard</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Visão geral do acervo documental da ASCOM
        </p>
      </div>

      {queueStatus && (queueStatus.pending > 0 || queueStatus.processing > 0) && (
        <QueueBanner queueStatus={queueStatus} />
      )}

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        {statsCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid-cols-2" style={{ gap: 16, marginBottom: 16, display: 'grid' }}>
        <CategoryChart categories={topCategories} maxCount={maxCatCount} />
        <FileTypeChart fileTypes={stats.fileTypes} />
      </div>

      <RecentFiles files={stats.recent as any} onSelectDoc={handleSelectDoc} />
    </div>
  )
}

const QueueBanner = memo(function QueueBanner({ queueStatus }: { queueStatus: any }) {
  const pct = queueStatus.total > 0 ? ((queueStatus.done / queueStatus.total) * 100) : 0
  return (
    <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '3px solid #7c4dff' }}>
      <div className="flex items-center justify-between gap-sm" style={{ flexWrap: 'wrap' }}>
        <div className="flex items-center gap-xs">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c4dff' }}>PROCESSANDO</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {queueStatus.done} concluídos · {queueStatus.pending} pendentes · {queueStatus.error} erros
          </span>
        </div>
        {queueStatus.paused && (
          <button onClick={() => api.queue.resume()} className="btn btn--primary btn--sm">Retomar</button>
        )}
      </div>
      <div style={{ marginTop: 8, height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'linear-gradient(90deg, #7c4dff, #536dfe)',
          borderRadius: 2, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
})

const CategoryChart = memo(function CategoryChart({ categories, maxCount }: { categories: { name: string; count: number }[]; maxCount: number }) {
  const gradients = [
    'linear-gradient(90deg, #7c4dff, #536dfe)', 'linear-gradient(90deg, #00c853, #69f0ae)',
    'linear-gradient(90deg, #ff9100, #ffd740)', 'linear-gradient(90deg, #ff1744, #ff6e40)',
    'linear-gradient(90deg, #00b8d4, #84ffff)', 'linear-gradient(90deg, #aa00ff, #e040fb)',
    'linear-gradient(90deg, #ff6d00, #ffab00)', 'linear-gradient(90deg, #00bfa5, #64ffda)',
    'linear-gradient(90deg, #d500f9, #ea80fc)', 'linear-gradient(90deg, #ff5722, #ff8a65)',
  ]
  return (
    <div className="card">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600 }}>📂 Distribuição por Categoria</h3>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {categories.map((c, i) => {
          const pct = (c.count / maxCount) * 100
          return (
            <div key={c.name} className="flex items-center gap-xs">
              <span className="truncate shrink-0" style={{ width: 160, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.name}</span>
              <div className="flex-1" style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: gradients[i % gradients.length], borderRadius: 3, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>
              <span className="font-bold shrink-0" style={{ fontSize: '0.8rem', minWidth: 28, textAlign: 'right' }}>{c.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

const FileTypeChart = memo(function FileTypeChart({ fileTypes }: { fileTypes: { extension: string; count: number }[] }) {
  const maxCount = Math.max(...fileTypes.map(ft => ft.count), 1)
  const extIcons: Record<string, string> = {
    '.pdf': '📄', '.doc': '📝', '.docx': '📝', '.xlsx': '📊', '.xls': '📊',
    '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.webp': '🖼️',
    '.pptx': '📽️', '.ppt': '📽️', '.txt': '📃',
  }
  const colors = ['#e53935', '#1565c0', '#1565c0', '#2e7d32', '#2e7d32',
    '#6a1b9a', '#6a1b9a', '#6a1b9a', '#6a1b9a', '#e65100', '#e65100', '#546e7a']
  return (
    <div className="card">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600 }}>📄 Tipos de Arquivo</h3>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {fileTypes.slice(0, 10).map((t, i) => {
          const pct = (t.count / maxCount) * 100
          return (
            <div key={t.extension} className="flex items-center gap-xs">
              <span style={{ fontSize: '1rem', width: 24, textAlign: 'center' }}>{extIcons[t.extension] || '📎'}</span>
              <span className="shrink-0" style={{ width: 60, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.extension}</span>
              <div className="flex-1" style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: colors[i % colors.length], borderRadius: 3, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>
              <span className="font-bold shrink-0" style={{ fontSize: '0.8rem', minWidth: 28, textAlign: 'right' }}>{t.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ height: 28, width: 200, background: 'var(--bg-elevated)', borderRadius: 6, marginBottom: 8 }} />
        <div style={{ height: 16, width: 300, background: 'var(--bg-elevated)', borderRadius: 4 }} />
      </div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ height: 12, width: '60%', background: 'var(--bg-elevated)', borderRadius: 4, marginBottom: 10 }} />
            <div style={{ height: 30, width: '40%', background: 'var(--bg-elevated)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
