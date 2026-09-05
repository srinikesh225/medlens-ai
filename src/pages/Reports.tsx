import { Link } from 'react-router-dom'
import { FileText, Pill, ArrowRight, Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { useStore } from '@/store/store'
import { Chip } from '@/components/ui/badges'
import { formatDate } from '@/domain/util'
import { useUploadModal } from '@/App'
import { useStaticPageMeta } from '@/seo/usePageMeta'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PAGE_META } from '@/seo/siteConfig'

export default function Reports() {
  useStaticPageMeta('reports')
  const { record } = useStore()
  const { open } = useUploadModal()
  const reports = [...record.reports].sort((a, b) => b.reportDate.localeCompare(a.reportDate))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={PAGE_META.reports.breadcrumbs} />
          <h1 className="text-xl font-semibold text-ink-900">Reports</h1>
          <p className="text-sm text-ink-500 mt-1">{reports.length} documents ingested and structured.</p>
        </div>
        <button className="btn-primary" onClick={() => open()}><Upload size={16} /> Upload report</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {reports.map((r) => {
          const labs = record.labs.filter((l) => l.reportId === r.id)
          const isMed = r.kind === 'MEDICATION_RECORD'
          const ready = r.stage === 'READY'
          return (
            <Link key={r.id} to={`/reports/${r.id}`} className="group card p-5 hover:border-primary-300 hover:shadow-panel transition-all">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center h-11 w-11 rounded-lg bg-primary-50 text-primary-700 shrink-0">
                  {isMed ? <Pill size={19} /> : <FileText size={19} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink-900">{r.title}</div>
                  <div className="text-xs text-ink-500 mt-0.5">{r.labName} · {formatDate(r.reportDate)}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Chip tone="primary">{r.kind.replace('_', ' ').toLowerCase()}</Chip>
                    {isMed ? (
                      <Chip tone="neutral">{record.medications.length} medications</Chip>
                    ) : (
                      <Chip tone="neutral">{labs.length} values</Chip>
                    )}
                    {ready ? (
                      <span className="chip text-emerald-700"><CheckCircle2 size={13} /> Ready</span>
                    ) : (
                      <span className="chip text-primary-700"><Loader2 size={13} className="animate-spin" /> {r.stage.toLowerCase()}</span>
                    )}
                  </div>
                </div>
                <ArrowRight size={18} className="text-ink-300 group-hover:text-primary-600 shrink-0" />
              </div>
            </Link>
          )
        })}
      </div>

      <p className="text-xs text-ink-400">
        Original documents are retained as the source of truth. Extraction routes through schema
        validation before any value enters the record — open a report to see its pipeline and the
        split-screen document viewer.
      </p>
    </div>
  )
}
