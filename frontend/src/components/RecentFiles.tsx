import { memo } from 'react'

interface FileItem {
  id: number; name: string; extension: string; size_formatted: string; category: string; has_text: boolean
}

interface RecentFilesProps {
  files: FileItem[]
  onSelectDoc: (id: number) => void
}

const icons: Record<string, string> = {
  '.pdf': '📄', '.doc': '📝', '.docx': '📝', '.xlsx': '📊', '.xls': '📊',
  '.jpg': '🖼️', '.png': '🖼️', '.webp': '🖼️', '.pptx': '📽️', '.txt': '📃',
}

const FileRow = memo(function FileRow({ doc, index, onSelectDoc }: { doc: FileItem; index: number; onSelectDoc: (id: number) => void }) {
  return (
    <div
      onClick={() => onSelectDoc(doc.id)}
      className="flex items-center gap-xs cursor-pointer"
      style={{
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid transparent',
        opacity: 0,
        animation: `fadeIn 0.3s ease-out ${index * 0.05}s forwards`,
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{icons[doc.extension || ''] || '📎'}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500 }}>{doc.name}</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {doc.category} · {doc.size_formatted}
        </p>
      </div>
      {doc.has_text && (
        <span style={{
          fontSize: '0.6rem', background: 'oklch(58% 0.15 145 / 0.12)',
          color: 'oklch(58% 0.15 145)', padding: '2px 8px', borderRadius: 10, fontWeight: 600,
        }}>
          extraído
        </span>
      )}
      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>→</span>
    </div>
  )
})

export function RecentFiles({ files, onSelectDoc }: RecentFilesProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600 }}>📌 Documentos Recentes</h3>
      </div>
      <div style={{ padding: '12px 16px 16px', display: 'grid', gap: 6 }}>
        {files.slice(0, 8).map((doc, i) => (
          <FileRow key={doc.id} doc={doc} index={i} onSelectDoc={onSelectDoc} />
        ))}
      </div>
    </div>
  )
}
