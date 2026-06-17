import { useState, useEffect, ReactNode, Suspense, lazy } from 'react'
import { useTheme } from '../ThemeContext'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { api } from '../api'
import { ErrorBoundary } from './ErrorBoundary'
import { ProcessingToast } from './ProcessingToast'
import {
  LayoutDashboard, MessageSquare, AlertTriangle, Search, ScrollText, ShieldCheck,
  Mail, Activity, Radio, HeartPulse, GalleryHorizontalEnd, Network,
  TableProperties, FileStack, CalendarDays, BarChart3, BookOpen,
  Settings, Sun, Moon, ChevronLeft,
} from 'lucide-react'

const OperationalDashboard = lazy(() => import('../pages/OperationalDashboard').then(m => ({ default: m.OperationalDashboard })))
const DocumentDetail = lazy(() => import('../pages/DocumentDetail').then(m => ({ default: m.DocumentDetail })))
const GraphView = lazy(() => import('../pages/GraphView').then(m => ({ default: m.GraphView })))
const PlanView = lazy(() => import('../pages/PlanView').then(m => ({ default: m.PlanView })))
const SmartSearch = lazy(() => import('../pages/SmartSearch').then(m => ({ default: m.SmartSearch })))
const Timeline = lazy(() => import('../pages/Timeline').then(m => ({ default: m.Timeline })))
const CalendarHeatmap = lazy(() => import('../pages/CalendarHeatmap').then(m => ({ default: m.CalendarHeatmap })))
const ExecutiveReports = lazy(() => import('../pages/ExecutiveReports').then(m => ({ default: m.ExecutiveReports })))
const ConsultChat = lazy(() => import('../pages/ConsultChat').then(m => ({ default: m.ConsultChat })))
const CrisisPanel = lazy(() => import('../pages/CrisisPanel').then(m => ({ default: m.CrisisPanel })))
const PlanHealth = lazy(() => import('../pages/PlanHealth').then(m => ({ default: m.PlanHealth })))
const PressMailing = lazy(() => import('../pages/PressMailing').then(m => ({ default: m.PressMailing })))
const TalkingPointsMatrix = lazy(() => import('../pages/TalkingPointsMatrix').then(m => ({ default: m.TalkingPointsMatrix })))
const PressReleaseGenerator = lazy(() => import('../pages/PressReleaseGenerator').then(m => ({ default: m.PressReleaseGenerator })))
const CrisisSimulator = lazy(() => import('../pages/CrisisSimulator').then(m => ({ default: m.CrisisSimulator })))
const SettingsPage = lazy(() => import('../pages/Settings').then(m => ({ default: m.Settings })))
const StructuredData = lazy(() => import('../pages/StructuredData').then(m => ({ default: m.StructuredData })))
const DocumentStructure = lazy(() => import('../pages/DocumentStructure').then(m => ({ default: m.DocumentStructure })))
const PhotoGallery = lazy(() => import('../pages/PhotoGallery').then(m => ({ default: m.PhotoGallery })))

type Page =
  | 'dashboard' | 'detail' | 'graph' | 'plan' | 'search' | 'timeline' | 'calendar'
  | 'reports' | 'consult' | 'crisis' | 'health'
  | 'mailing' | 'matrix' | 'generator' | 'simulator' | 'settings'
  | 'structured-data' | 'document-structure' | 'gallery'

interface SidebarItem {
  page: Page
  label: string
  icon: ReactNode
  section: 'essencial' | 'ferramentas' | 'dados'
}

const iconSize = 16

const SIDEBAR_ITEMS: SidebarItem[] = [
  { page: 'dashboard', label: 'Painel', icon: <LayoutDashboard size={iconSize} />, section: 'essencial' },
  { page: 'consult', label: 'Consulta', icon: <MessageSquare size={iconSize} />, section: 'essencial' },
  { page: 'crisis', label: 'Crise', icon: <AlertTriangle size={iconSize} />, section: 'essencial' },
  { page: 'search', label: 'Busca', icon: <Search size={iconSize} />, section: 'essencial' },
  { page: 'generator', label: 'Rascunhar', icon: <ScrollText size={iconSize} />, section: 'ferramentas' },
  { page: 'matrix', label: 'Matriz', icon: <ShieldCheck size={iconSize} />, section: 'ferramentas' },
  { page: 'mailing', label: 'Mailing', icon: <Mail size={iconSize} />, section: 'ferramentas' },
  { page: 'simulator', label: 'Simulador', icon: <Radio size={iconSize} />, section: 'ferramentas' },
  { page: 'graph', label: 'Grafo', icon: <Network size={iconSize} />, section: 'dados' },
  { page: 'structured-data', label: 'Dados Estrut.', icon: <TableProperties size={iconSize} />, section: 'dados' },
  { page: 'document-structure', label: 'Documentos', icon: <FileStack size={iconSize} />, section: 'dados' },
  { page: 'health', label: 'Saúde', icon: <HeartPulse size={iconSize} />, section: 'dados' },
  { page: 'timeline', label: 'Timeline', icon: <Activity size={iconSize} />, section: 'dados' },
  { page: 'calendar', label: 'Calendário', icon: <CalendarDays size={iconSize} />, section: 'ferramentas' },
  { page: 'reports', label: 'Relatórios', icon: <BarChart3 size={iconSize} />, section: 'dados' },
  { page: 'plan', label: 'Plano', icon: <BookOpen size={iconSize} />, section: 'dados' },
  { page: 'gallery', label: 'Galeria', icon: <GalleryHorizontalEnd size={iconSize} />, section: 'dados' },
]

const DocumentDetailRouteWrapper = ({ onBack, onRelated }: { onBack: () => void, onRelated: (id: number) => void }) => {
  const { id } = useParams<{ id: string }>()
  return <DocumentDetail id={Number(id)} onBack={onBack} onRelated={onRelated} />
}

const SECTION_LABELS: Record<string, string> = {
  essencial: 'Essencial',
  ferramentas: 'Ferramentas',
  dados: 'Base de Dados',
}

export function AppLayout() {
  const { themeName, toggleTheme } = useTheme()
  const location = useLocation()
  const reactNavigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(() => api.isLoggedIn())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        reactNavigate('/search')
      }
      if (e.key === 'Escape') {
        reactNavigate(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reactNavigate])

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />
  }

  const getPageFromPath = (pathname: string): Page => {
    if (pathname === '/') return 'dashboard'
    if (pathname.startsWith('/detail/')) return 'detail'
    return pathname.slice(1) as Page
  }

  const page = getPageFromPath(location.pathname)

  const navigate = (p: Page, docId?: number) => {
    if (p === 'dashboard') reactNavigate('/')
    else if (p === 'detail' && docId) reactNavigate(`/detail/${docId}`)
    else reactNavigate(`/${p}`)
  }

  const pageLabel = SIDEBAR_ITEMS.find(i => i.page === page)?.label || (page === 'detail' ? 'Detalhe do Documento' : 'Plano de Comunicação')

  return (
    <>
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
        <div className={`sidebar-logo ${sidebarOpen ? 'sidebar-logo--open' : 'sidebar-logo--closed'}`}>
          <div className="sidebar-logo-icon">PC</div>
          {sidebarOpen && (
            <div>
              <div className="sidebar-logo-title">Plano de Comunicação</div>
              <div className="sidebar-logo-sub">NOVACAP · ASCOM</div>
            </div>
          )}
        </div>

        <nav className={`sidebar-nav ${sidebarOpen ? 'sidebar-nav--open' : 'sidebar-nav--closed'}`}>
          {(['essencial', 'ferramentas', 'dados'] as const).map(section => {
            const items = SIDEBAR_ITEMS.filter(i => i.section === section)
            if (!sidebarOpen) return items.map(item => (
              <button key={item.page} onClick={() => navigate(item.page)}
                className={`sidebar-item--compact ${page === item.page ? 'active' : ''}`}
                title={item.label}>
                <span className="sidebar-item-icon">{item.icon}</span>
                {page === item.page && <span className="sidebar-item-indicator" />}
              </button>
            ))
            return (
              <div key={section}>
                <div className="sidebar-section-label">{SECTION_LABELS[section]}</div>
                {items.map(item => {
                  const active = page === item.page
                  return (
                    <button key={item.page} onClick={() => navigate(item.page)}
                      className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}>
                      <span className="sidebar-item-icon">{item.icon}</span>
                      <span className="sidebar-item-label">{item.label}</span>
                      {active && <span className="sidebar-item-indicator" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className={`sidebar-collapse ${!sidebarOpen ? 'sidebar-collapse--closed' : ''}`}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="sidebar-collapse-btn">
            <span className="flex" style={{ transform: sidebarOpen ? 'rotate(0)' : 'rotate(180deg)' }}>
              <ChevronLeft size={12} />
            </span>
            {sidebarOpen && 'Recolher'}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-breadcrumbs">
            <span className="breadcrumb-link" onClick={() => navigate('dashboard')}>Painel</span>
            {page !== 'dashboard' && (
              <>
                <span className="breadcrumb-separator">/</span>
                {page === 'detail' ? (
                  <>
                    <span className="breadcrumb-link" onClick={() => navigate('document-structure')}>Base de Dados</span>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-link" onClick={() => navigate('document-structure')}>Documentos</span>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">Detalhe</span>
                  </>
                ) : (
                  <>
                    {(() => {
                      const item = SIDEBAR_ITEMS.find(i => i.page === page)
                      const sectionLabel = item ? SECTION_LABELS[item.section] : ''
                      return sectionLabel ? (
                        <>
                          <span className="breadcrumb-section">{sectionLabel}</span>
                          <span className="breadcrumb-separator">/</span>
                        </>
                      ) : null
                    })()}
                    <span className="breadcrumb-current">{pageLabel}</span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="topbar-actions">
            <button onClick={toggleTheme}
              className="topbar-btn"
              title={themeName === 'dark' ? 'Modo claro' : 'Modo escuro'}>
              {themeName === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => navigate('settings')}
              className={`topbar-btn ${page === 'settings' ? 'topbar-btn--active' : ''}`}
              title="Configurações">
              <Settings size={14} />
            </button>
          </div>
        </header>

        <main className="main-content">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<div className="loading-suspense"><div className="spinner" /></div>}>
              <AppRoutes navigate={navigate} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
    <ProcessingToast />
  </>
  )
}

function AppRoutes({ navigate }: { navigate: (page: Page, docId?: number) => void }) {
  return (
    <Routes>
      <Route path="/" element={<OperationalDashboard onSelectDoc={(id) => navigate('detail', id)} onNavigate={(p) => navigate(p as Page)} />} />
      <Route path="/consult" element={<ConsultChat onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/crisis" element={<CrisisPanel onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/generator" element={<PressReleaseGenerator />} />
      <Route path="/matrix" element={<TalkingPointsMatrix />} />
      <Route path="/mailing" element={<PressMailing />} />
      <Route path="/simulator" element={<CrisisSimulator />} />
      <Route path="/health" element={<PlanHealth />} />
      <Route path="/search" element={<SmartSearch onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/timeline" element={<Timeline onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/calendar" element={<CalendarHeatmap />} />
      <Route path="/reports" element={<ExecutiveReports onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/detail/:id" element={<DocumentDetailRouteWrapper onBack={() => navigate('dashboard')} onRelated={(id) => navigate('detail', id)} />} />
      <Route path="/graph" element={<GraphView onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/plan" element={<PlanView onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/structured-data" element={<StructuredData onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/document-structure" element={<DocumentStructure onSelectDoc={(id) => navigate('detail', id)} />} />
      <Route path="/gallery" element={<PhotoGallery onSelectDoc={(id) => navigate('detail', id)} />} />
    </Routes>
  )
}
