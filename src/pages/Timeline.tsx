import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Pill, ClipboardCheck, ChevronRight, TrendingUp } from 'lucide-react'
import { useStore } from '@/store/store'
import { buildTimeline } from '@/demo/seed'
import { computeTrends } from '@/domain/trends'
import { SectionTitle, DisclaimerBar } from '@/components/ui/misc'
import { StatusPill, Chip } from '@/components/ui/badges'
import { TrendChart } from '@/components/ui/viz'
import { formatDate } from '@/domain/util'
import type { TimelineEvent } from '@/domain/types'
import { useStaticPageMeta } from '@/seo/usePageMeta'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PAGE_META } from '@/seo/siteConfig'

export default function Timeline() {
  useStaticPageMeta('timeline')
  const { record } = useStore()
  const timeline = buildTimeline(record)
  const trends = computeTrends(record.labs)
  const [openId, setOpenId] = useState<string | null>(timeline[0]?.id ?? null)

  function icon(kind: TimelineEvent['kind']) {
    if (kind === 'MEDICATION_RECORD') return <Pill size={15} />
    if (kind === 'REVIEW') return <ClipboardCheck size={15} />
    return <FileText size={15} />
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={PAGE_META.timeline.breadcrumbs} />
        <h1 className="text-xl font-semibold text-ink-900">Timeline &amp; trends</h1>
        <p className="text-sm text-ink-500 mt-1">The patient’s history in order, and how repeated tests changed — described as data, not diagnosis.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-3 card p-5">
          <SectionTitle title="Patient timeline" />
          <ol className="relative border-l-2 border-ink-100 ml-3">
            {timeline.map((e) => {
              const labs = record.labs.filter((l) => l.reportId === e.reportId)
              const open = openId === e.id
              return (
                <li key={e.id} className="ml-6 pb-5 last:pb-0">
                  <span className={`absolute -left-[9px] grid place-items-center h-4 w-4 rounded-full ring-4 ring-white ${e.kind === 'REVIEW' ? 'bg-primary-600' : 'bg-ink-300'}`} />
                  <button className="w-full text-left" onClick={() => setOpenId(open ? null : e.id)}>
                    <div className="flex items-center gap-2">
                      <span className="text-ink-400">{icon(e.kind)}</span>
                      <span className="font-medium text-ink-800">{e.title}</span>
                      <ChevronRight size={15} className={`ml-auto text-ink-300 transition-transform ${open ? 'rotate-90' : ''}`} />
                    </div>
                    <div className="text-xs text-ink-400 mt-0.5 ml-6">{formatDate(e.date)} · {e.summary}</div>
                  </button>
                  {open && labs.length > 0 && (
                    <div className="mt-2 ml-6 rounded-lg border border-ink-100 divide-y divide-ink-50">
                      {labs.map((l) => (
                        <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                          <span className="text-ink-700">{l.testName}</span>
                          <span className="tabular-nums text-ink-500">{l.valueRaw} {l.unit}</span>
                          <span className="ml-auto"><StatusPill status={l.status} compact /></span>
                        </div>
                      ))}
                      {e.reportId && (
                        <Link to={`/reports/${e.reportId}`} className="block px-3 py-1.5 text-xs text-primary-700 hover:underline">Open report →</Link>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        {/* Trends */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-ink-700">
            <TrendingUp size={18} className="text-primary-600" />
            <h2 className="font-semibold">Trends</h2>
          </div>
          {trends.length === 0 && (
            <div className="card p-5 text-sm text-ink-500">No test has repeated measurements yet.</div>
          )}
          {trends.map((t) => (
            <div key={t.normalizedKey} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-ink-800">{t.testName} <span className="text-ink-400 text-sm">{t.unit}</span></span>
                <Chip tone={t.direction === 'STABLE' ? 'neutral' : 'primary'} className="scale-90">{t.direction.toLowerCase()}</Chip>
              </div>
              <TrendChart series={t} />
              <p className="text-[13px] text-ink-500 mt-1">{t.dataNote}</p>
            </div>
          ))}
          {trends.length > 0 && (
            <p className="text-xs text-ink-400 px-1">
              Trends describe the reported numbers only. MedLens does not interpret whether a change
              is clinically good or bad.
            </p>
          )}
        </div>
      </div>

      <DisclaimerBar text="Data trends are not medical interpretation. Only a qualified clinician can judge what a change in a value means for this patient." />
    </div>
  )
}
