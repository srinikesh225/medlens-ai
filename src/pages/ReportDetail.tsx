import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, CheckCircle2, Crosshair, ShieldCheck } from 'lucide-react'
import { useStore, REVIEWER } from '@/store/store'
import { SourceDocument } from '@/components/SourceDocument'
import { LabItem } from '@/components/LabItem'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ProvenanceBadge, Chip } from '@/components/ui/badges'
import { SectionTitle } from '@/components/ui/misc'
import { formatDate, NOT_IN_SOURCE } from '@/domain/util'
import { usePageMeta } from '@/seo/usePageMeta'
import { PAGE_META } from '@/seo/siteConfig'
import type { LabResult, SourceSpan } from '@/domain/types'

const PIPELINE_DONE = [
  'Text / OCR extraction',
  'Segmentation',
  'Structured extraction',
  'Schema validation',
  'Reference-range check',
  'Provenance',
  'Conflict scan',
]

export default function ReportDetail() {
  const { id } = useParams()
  const { record, dispatch } = useStore()
  const [activeSpan, setActiveSpan] = useState<SourceSpan | null>(null)
  const [activeLabId, setActiveLabId] = useState<string | null>(null)

  const report = record.reports.find((r) => r.id === id)

  usePageMeta(
    report
      ? {
          path: `/reports/${report.id}`,
          title: `${report.title} — MedLens`,
          description: `Structured, source-linked extraction of “${report.title}” from ${report.labName ?? 'the reporting lab'}, with reference-range status computed only from the source document.`,
          breadcrumbs: [
            ...PAGE_META.reports.breadcrumbs,
            { name: report.title, path: `/reports/${report.id}` },
          ],
          pageType: 'MedicalWebPage',
        }
      : PAGE_META.notFound,
  )

  if (!report) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-h2 text-ink">Report not found</h1>
        <p className="text-secondary mt-2">
          No report with that id is on file. It may have been removed by a demo reset.
        </p>
        <Link to="/reports" className="btn-secondary mt-4 inline-flex">Back to reports</Link>
      </div>
    )
  }

  const labs = record.labs.filter((l) => l.reportId === report.id)
  const meds = record.medications.filter((m) => m.provenance.reportId === report.id)
  const unreviewed = labs.filter((l) => l.verification === 'UNREVIEWED').length

  function viewSource(lab: LabResult) {
    if (lab.provenance.span) {
      setActiveSpan(lab.provenance.span)
      setActiveLabId(lab.id)
    }
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[...PAGE_META.reports.breadcrumbs, { name: report.title, path: `/reports/${report.id}` }]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{report.title}</h1>
          <p className="text-sm text-ink-500 mt-1">{report.labName} · {formatDate(report.reportDate)} · extracted by {report.extractionModel}</p>
        </div>
        {unreviewed > 0 && (
          <button
            className="btn-primary"
            onClick={() => dispatch({ type: 'VERIFY_ALL_IN_REPORT', reportId: report.id, actor: REVIEWER })}
          >
            <ShieldCheck size={16} /> Verify all {unreviewed} value(s)
          </button>
        )}
      </div>

      {/* Completed pipeline chips */}
      <div className="flex flex-wrap gap-2">
        {PIPELINE_DONE.map((s) => (
          <span key={s} className="chip bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> {s}
          </span>
        ))}
      </div>

      {/* Split screen */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* LEFT — original */}
        <div className="card overflow-hidden lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ink-100 bg-ink-50">
            <FileText size={15} className="text-ink-400" />
            <span className="text-sm font-medium text-ink-700">Original report</span>
            <span className="text-xs text-ink-400 ml-auto">source of truth</span>
          </div>
          <div className="p-4 max-h-[70vh] overflow-y-auto scroll-thin bg-white">
            <SourceDocument report={report} activeSpan={activeSpan} />
          </div>
          {activeSpan && (
            <div className="px-4 py-2 border-t border-ink-100 bg-amber-50 text-xs text-amber-800 flex items-center gap-1.5">
              <Crosshair size={12} /> Highlighting the source of the selected value.
              <button className="ml-auto underline" onClick={() => { setActiveSpan(null); setActiveLabId(null) }}>Clear</button>
            </div>
          )}
        </div>

        {/* RIGHT — structured */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium text-ink-700">Structured record</span>
            <span className="text-xs text-ink-400">click <span className="font-medium">View source</span> to trace any value</span>
          </div>

          {labs.map((l) => (
            <LabItem
              key={l.id}
              lab={l}
              conflicts={record.conflicts}
              onViewSource={viewSource}
              active={activeLabId === l.id}
            />
          ))}

          {meds.length > 0 && (
            <div className="card p-4">
              <SectionTitle title="Medications" />
              <div className="space-y-2">
                {meds.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 flex-wrap rounded-lg border border-ink-200 px-3 py-2">
                    <span className="text-sm font-medium text-ink-800">{m.name}</span>
                    <span className="text-xs text-ink-500">{[m.dose, m.frequency].filter(Boolean).join(' · ') || NOT_IN_SOURCE}</span>
                    {m.status !== 'ACTIVE' && <Chip tone={m.status === 'UNKNOWN' ? 'warn' : 'neutral'}>{m.status.toLowerCase()}</Chip>}
                    <span className="ml-auto flex items-center gap-2">
                      <ProvenanceBadge type={m.verification === 'VERIFIED' || m.verification === 'EDITED' ? 'HUMAN_VERIFIED' : m.provenance.sourceType} className="scale-90" />
                      {m.provenance.span && (
                        <button className="btn-ghost px-2 py-1 text-xs text-primary-700" onClick={() => { setActiveSpan(m.provenance.span!); setActiveLabId(m.id) }}>
                          <Crosshair size={13} /> Source
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {labs.length === 0 && meds.length === 0 && (
            <div className="card p-6 text-center text-sm text-ink-500">No structured items for this report.</div>
          )}
        </div>
      </div>
    </div>
  )
}
