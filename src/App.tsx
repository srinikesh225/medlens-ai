import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  UserRound,
  FileText,
  ClipboardCheck,
  GitCommitVertical,
  FileCheck2,
  Upload,
  RotateCcw,
  ShieldCheck,
  Search,
  Bell,
} from 'lucide-react'
import { Logo } from './components/ui/misc'
import { useStore, REVIEWER } from './store/store'
import { recordStats } from './store/selectors'
import { UploadModal } from './components/UploadModal'
import type { SampleReport } from './demo/samples'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const PatientProfile = lazy(() => import('./pages/PatientProfile'))
const Reports = lazy(() => import('./pages/Reports'))
const ReportDetail = lazy(() => import('./pages/ReportDetail'))
const Review = lazy(() => import('./pages/Review'))
const Timeline = lazy(() => import('./pages/Timeline'))
const Summary = lazy(() => import('./pages/Summary'))
const NotFound = lazy(() => import('./pages/NotFound'))

/* Upload modal controller, available app-wide. */
interface UploadUI {
  open: (prefill?: SampleReport) => void
}
const UploadCtx = createContext<UploadUI | null>(null)
export const useUploadModal = () => {
  const c = useContext(UploadCtx)
  if (!c) throw new Error('UploadCtx missing')
  return c
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/patient', label: 'Patient', icon: UserRound },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/review', label: 'Review', icon: ClipboardCheck, badge: 'review' },
  { to: '/timeline', label: 'Timeline & Trends', icon: GitCommitVertical },
  { to: '/summary', label: 'AI Summary', icon: FileCheck2 },
]

function Sidebar() {
  const { record } = useStore()
  const stats = recordStats(record)
  const reviewCount = stats.openConflicts + stats.unreviewed + stats.openClarifications
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-ink-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-100">
        <Logo />
        <div className="leading-tight">
          <div className="font-semibold text-ink-900">MedLens</div>
          <div className="text-[11px] text-ink-400 -mt-0.5">Clinical Information Intelligence</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((n) => {
          const Icon = n.icon
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-800' : 'text-ink-600 hover:bg-ink-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary-600" aria-hidden />}
                  <span className={`icon-chip h-7 w-7 rounded-lg transition-colors ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-transparent text-ink-400 group-hover:text-ink-600'}`}>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="flex-1">{n.label}</span>
                  {n.badge === 'review' && reviewCount > 0 && (
                    <span className="chip bg-amber-100 text-amber-800 px-1.5 py-0 text-[11px] tabular-nums">{reviewCount}</span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className="p-3 border-t border-ink-100">
        <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
          <ShieldCheck size={14} className="text-primary-600" />
          <span>Reviewer: <span className="font-medium text-ink-700">{REVIEWER}</span></span>
        </div>
      </div>
    </aside>
  )
}

function PatientHeader() {
  const { record } = useStore()
  const d = record.demographics
  const stats = recordStats(record)
  const reviewCount = stats.openConflicts + stats.unreviewed + stats.openClarifications
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-16 px-5 md:px-7 bg-canvas/80 backdrop-blur">
      <div className="flex items-center gap-3 min-w-0">
        <div className="grid place-items-center h-10 w-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-800 font-semibold shrink-0 ring-2 ring-white shadow-card">
          {d.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-ink-900 truncate">{d.name}</div>
          <div className="text-xs text-ink-500 truncate">
            {d.patientId} · {d.age} · {d.sex}
          </div>
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-2 ml-2 text-xs">
        {stats.openConflicts > 0 && (
          <span className="chip bg-rose-50 text-rose-700 border border-rose-200">⚠ {stats.openConflicts} conflict{stats.openConflicts > 1 ? 's' : ''}</span>
        )}
        {stats.missingRange > 0 && (
          <span className="chip bg-stone-100 text-stone-700 border border-stone-200">{stats.missingRange} missing range</span>
        )}
        <span className="chip bg-emerald-50 text-emerald-700 border border-emerald-200">✓ {stats.verified} verified</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Link to="/review" className="icon-btn hidden sm:grid" title="Search & filter values" aria-label="Search and filter values">
          <Search size={17} />
        </Link>
        <Link to="/review" className="icon-btn relative hidden sm:grid" title="Items needing attention" aria-label="Items needing attention">
          <Bell size={17} />
          {reviewCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-[17px] h-[17px] px-1 rounded-full bg-vital-500 text-white text-[10px] font-semibold tabular-nums ring-2 ring-canvas">
              {reviewCount}
            </span>
          )}
        </Link>
        <ResetButton />
        <UploadButton />
      </div>
    </header>
  )
}

function UploadButton() {
  const { open } = useUploadModal()
  return (
    <button className="btn-accent" onClick={() => open()}>
      <Upload size={16} /> <span className="hidden sm:inline">Upload report</span>
    </button>
  )
}

function ResetButton() {
  const { dispatch } = useStore()
  return (
    <button
      className="btn-secondary"
      onClick={() => {
        if (confirm('Reset to the seeded demo patient? This clears any local review changes.')) {
          dispatch({ type: 'RESET_ALL' })
        }
      }}
      title="Reset the demo to its seeded state"
    >
      <RotateCcw size={15} /> <span className="hidden sm:inline">Reset demo</span>
    </button>
  )
}

function ScrollTopOnRouteChange() {
  const { pathname } = useLocation()
  useEffect(() => {
    const main = document.getElementById('main-scroll')
    if (main) main.scrollTop = 0
  }, [pathname])
  return null
}

function PageLoading() {
  return (
    <div className="py-20 flex justify-center" role="status" aria-label="Loading">
      <div className="h-6 w-6 rounded-full border-2 border-ink-200 border-t-primary-600 animate-spin" />
    </div>
  )
}

export default function App() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [prefill, setPrefill] = useState<SampleReport | undefined>()

  const ui: UploadUI = {
    open: (p) => {
      setPrefill(p)
      setUploadOpen(true)
    },
  }

  return (
    <UploadCtx.Provider value={ui}>
      <div className="flex h-screen overflow-hidden bg-canvas">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <PatientHeader />
          <main id="main-scroll" className="flex-1 overflow-y-auto scroll-thin">
            <ScrollTopOnRouteChange />
            <div className="max-w-6xl mx-auto px-5 md:px-7 py-6">
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/patient" element={<PatientProfile />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/reports/:id" element={<ReportDetail />} />
                  <Route path="/review" element={<Review />} />
                  <Route path="/timeline" element={<Timeline />} />
                  <Route path="/summary" element={<Summary />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </div>
          </main>
        </div>
        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} prefill={prefill} />
      </div>
    </UploadCtx.Provider>
  )
}
