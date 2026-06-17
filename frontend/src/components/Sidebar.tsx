import { Category, FileType } from '../types'
import { useTheme } from '../ThemeContext'

interface SidebarProps {
  categories: Category[]
  fileTypes: FileType[]
  selectedCategory: string | null
  selectedType: string | null
  onSelectCategory: (name: string) => void
  onSelectType: (ext: string) => void
  onClear: () => void
}

export function Sidebar({
  categories,
  fileTypes,
  selectedCategory,
  selectedType,
  onSelectCategory,
  onSelectType,
  onClear,
}: SidebarProps) {
  const { theme: t } = useTheme()
  const isFiltering = selectedCategory || selectedType

  return (
    <div style={styles.sidebar}>
      {isFiltering && (
        <button style={styles.clearBtn(t)} onClick={onClear} aria-label="Limpar filtros">
          ✕ Limpar filtros
        </button>
      )}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle(t)}>Categorias</h3>
        {categories.map(c => (
          <button
            key={c.name}
            style={{
              ...styles.item(t),
              ...(selectedCategory === c.name ? styles.itemActive(t) : {}),
            }}
            onClick={() => onSelectCategory(c.name)}
          >
            <span style={styles.itemName}>{c.name}</span>
            <span style={styles.itemCount(t)}>{c.count}</span>
          </button>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle(t)}>Tipos de Arquivo</h3>
        {fileTypes.map(ft => (
          <button
            key={ft.extension}
            style={{
              ...styles.item(t),
              ...(selectedType === ft.extension ? styles.itemActive(t) : {}),
            }}
            onClick={() => onSelectType(ft.extension)}
          >
            <span style={styles.itemName}>{ft.extension}</span>
            <span style={styles.itemCount(t)}>{ft.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  sidebar: {
    padding: '12px 16px',
  } as React.CSSProperties,
  clearBtn: (t: any): React.CSSProperties => ({
    width: '100%',
    padding: '8px 12px',
    marginBottom: 12,
    border: `1px solid ${t.colors.border}`,
    borderRadius: 6,
    background: t.colors.bgCard,
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  }),
  section: {
    marginBottom: 20,
  } as React.CSSProperties,
  sectionTitle: (t: any): React.CSSProperties => ({
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: t.colors.textSecondary,
    margin: '0 0 8px',
    letterSpacing: '0.5px',
  }),
  item: (t: any): React.CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '6px 10px',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: t.colors.text,
    marginBottom: 2,
    textAlign: 'left' as const,
    fontFamily: 'inherit',
  }),
  itemActive: (t: any): React.CSSProperties => ({
    background: t.colors.activeBg,
    color: t.colors.primary,
    fontWeight: 600,
  }),
  itemName: {} as React.CSSProperties,
  itemCount: (t: any): React.CSSProperties => ({
    fontSize: '0.75rem',
    color: t.colors.textMuted,
    background: t.colors.bgElevated,
    padding: '2px 8px',
    borderRadius: 10,
  }),
}
