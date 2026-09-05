import { Link } from 'react-router-dom'
import { Compass, LayoutDashboard, FileText, ClipboardCheck } from 'lucide-react'
import { Logo } from '@/components/ui/misc'
import { usePageMeta } from '@/seo/usePageMeta'
import { PAGE_META } from '@/seo/siteConfig'

export default function NotFound() {
  usePageMeta(PAGE_META.notFound)
  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="flex justify-center mb-5"><Logo size={48} /></div>
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Error 404</p>
      <h1 className="text-2xl font-semibold text-ink-900 mt-1">This page could not be found</h1>
      <p className="text-ink-500 mt-2">
        The link may be broken or the page may have moved. Here are the main areas of MedLens.
      </p>
      <div className="mt-6 grid sm:grid-cols-3 gap-3 text-left">
        <Link to="/" className="card p-4 hover:border-primary-300 hover:shadow-panel transition-all">
          <LayoutDashboard size={18} className="text-primary-600" />
          <div className="font-medium text-ink-800 mt-2 text-sm">Dashboard</div>
          <div className="text-xs text-ink-500">Patient overview</div>
        </Link>
        <Link to="/reports" className="card p-4 hover:border-primary-300 hover:shadow-panel transition-all">
          <FileText size={18} className="text-primary-600" />
          <div className="font-medium text-ink-800 mt-2 text-sm">Reports</div>
          <div className="text-xs text-ink-500">Ingested documents</div>
        </Link>
        <Link to="/review" className="card p-4 hover:border-primary-300 hover:shadow-panel transition-all">
          <ClipboardCheck size={18} className="text-primary-600" />
          <div className="font-medium text-ink-800 mt-2 text-sm">Review</div>
          <div className="text-xs text-ink-500">Human-in-the-loop</div>
        </Link>
      </div>
      <Link to="/" className="btn-primary mt-6 inline-flex"><Compass size={16} /> Back to dashboard</Link>
    </div>
  )
}
