import { useState, useEffect } from 'react'
import { api } from '../api'

interface PhotoEvent {
  id: number
  event_date: string
  event_name: string
  source_path: string
  month_folder: string
  thumbnail_path: string
  photo_count: number
  indexed_at: string
}

interface Photo {
  id: number
  event_id: number
  filename: string
  source_path: string
  thumbnail_path: string
  file_size: number
  width: number
  height: number
}

interface EventDetail extends PhotoEvent {
  photos: Photo[]
  documents: { id: number; name: string; extension: string; category: string; confidence: number }[]
}

const MONTH_NAMES: Record<string, string> = {
  '01-JAN': 'Janeiro', '02-FEV': 'Fevereiro', '03-MAR': 'Março',
  '04-ABR': 'Abril', '05-MAIO': 'Maio', '06-JUN': 'Junho',
  '07-JUL': 'Julho', '08-AGO': 'Agosto', '09-SET': 'Setembro',
  '10-OUT': 'Outubro', '11-NOV': 'Novembro', '12-DEZ': 'Dezembro',
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByMonth(events: PhotoEvent[]): Record<string, PhotoEvent[]> {
  const groups: Record<string, PhotoEvent[]> = {}
  for (const e of events) {
    const m = e.month_folder || 'outros'
    if (!groups[m]) groups[m] = []
    groups[m].push(e)
  }
  return groups
}

export function PhotoGallery({ onSelectDoc }: { onSelectDoc?: (id: number) => void }) {
  const [events, setEvents] = useState<PhotoEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null)
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [indexing, setIndexing] = useState(false)

  useEffect(() => { loadEvents() }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await api.photos.events()
      setEvents(data)
    } catch { }
    setLoading(false)
  }

  const openEvent = async (id: number) => {
    try {
      const data = await api.photos.event(id)
      setSelectedEvent(data)
    } catch { }
  }

  const openViewer = (photo: Photo, index: number) => {
    setViewerPhoto(photo)
    setViewerIndex(index)
  }

  const startIndexing = async () => {
    setIndexing(true)
    try {
      await api.photos.index()
      await loadEvents()
    } catch { }
    setIndexing(false)
  }

  if (viewerPhoto && selectedEvent) {
    const photos = selectedEvent.photos
    const currentIdx = viewerIndex
    const prev = () => {
      const i = currentIdx > 0 ? currentIdx - 1 : photos.length - 1
      setViewerPhoto(photos[i]!); setViewerIndex(i)
    }
    const next = () => {
      const i = currentIdx < photos.length - 1 ? currentIdx + 1 : 0
      setViewerPhoto(photos[i]!); setViewerIndex(i)
    }

    return (
      <div className="photo-viewer-overlay" onClick={() => setViewerPhoto(null)}>
        <div className="photo-viewer-content" onClick={e => e.stopPropagation()}>
          <div className="photo-viewer-topbar">
            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
              {viewerPhoto.filename} — {currentIdx + 1} de {photos.length}
            </span>
            <button className="btn btn--ghost btn--icon" onClick={() => setViewerPhoto(null)} style={{ fontSize: '1.2rem' }} aria-label="Fechar visualizador">✕</button>
          </div>
          <div className="photo-viewer-image-wrap">
            <button className="photo-viewer-nav photo-viewer-nav--prev" onClick={prev} aria-label="Foto anterior">‹</button>
            <img
              src={api.photos.serveUrl(viewerPhoto.source_path)}
              alt={viewerPhoto.filename}
              className="photo-viewer-image"
            />
            <button className="photo-viewer-nav photo-viewer-nav--next" onClick={next} aria-label="Próxima foto">›</button>
          </div>
        </div>
      </div>
    )
  }

  if (selectedEvent) {
    return (
      <div>
        <div className="flex items-center gap-sm" style={{ marginBottom: 20 }}>
          <button className="btn btn--ghost" onClick={() => setSelectedEvent(null)}>← Voltar</button>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, flex: 1 }}>{selectedEvent.event_name}</h1>
        </div>
        <p className="text-secondary" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
          {formatDate(selectedEvent.event_date)} • {selectedEvent.photo_count} fotos • {selectedEvent.month_folder && MONTH_NAMES[selectedEvent.month_folder] || selectedEvent.month_folder}
        </p>

        {selectedEvent.documents.length > 0 && (
          <div className="card" style={{ marginBottom: 16, padding: 14 }}>
            <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: 8 }}>Documentos Relacionados</strong>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
              {selectedEvent.documents.map(doc => (
                <button key={doc.id} className="btn btn--secondary btn--sm"
                  onClick={() => onSelectDoc?.(doc.id)}>
                  📄 {doc.name.length > 40 ? doc.name.slice(0, 40) + '…' : doc.name}
                  <span className="badge badge--info" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                    {Math.round(doc.confidence * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="photo-grid">
          {selectedEvent.photos.map((photo, i) => (
            <div key={photo.id} className="photo-grid-item" onClick={() => openViewer(photo, i)}>
              <img
                src={api.photos.thumbUrl(photo.thumbnail_path)}
                alt={photo.filename}
                className="photo-thumb"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const grouped = groupByMonth(events)
  const monthOrder = ['01-JAN', '02-FEV', '03-MAR', '04-ABR', '05-MAIO', '06-JUN',
    '07-JUL', '08-AGO', '09-SET', '10-OUT', '11-NOV', '12-DEZ']

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Galeria de Fotos</h1>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: 4 }}>
            {events.length} eventos • {events.reduce((s, e) => s + e.photo_count, 0)} fotos
          </p>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={startIndexing} disabled={indexing}>
          {indexing ? 'Indexando…' : 'Atualizar'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center" style={{ padding: 60 }}>
          <span className="text-muted">Carregando…</span>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="card flex-col items-center justify-center" style={{ padding: 60, textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>📷</p>
          <p className="text-secondary">Nenhuma foto indexada</p>
          <button className="btn btn--primary" onClick={startIndexing} style={{ marginTop: 16 }}>
            Indexar Fotos Agora
          </button>
        </div>
      )}

      {!loading && monthOrder.map(month => {
        const monthEvents = grouped[month]
        if (!monthEvents) return null
        return (
          <div key={month} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>
              {MONTH_NAMES[month] || month}
            </h2>
            <div className="photo-grid">
              {monthEvents.map(ev => (
                <div key={ev.id} className="card photo-event-card" onClick={() => openEvent(ev.id)}>
                  {ev.thumbnail_path ? (
                    <img src={api.photos.thumbUrl(ev.thumbnail_path)} alt="" className="photo-event-thumb" />
                  ) : (
                    <div className="photo-event-thumb placeholder">📷</div>
                  )}
                  <div className="photo-event-info">
                    <strong className="truncate" style={{ fontSize: '0.8rem' }}>{ev.event_name}</strong>
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>{formatDate(ev.event_date)}</span>
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>{ev.photo_count} fotos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
