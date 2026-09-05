import { useMemo, useState } from 'react'
import { ShieldCheck, Printer, Download, Copy, Check, FileCheck2 } from 'lucide-react'
import { useStore } from '@/store/store'
import { computeTrends } from '@/domain/trends'
import { composeSummary } from '@/domain/summary'
import { SectionTitle, DisclaimerBar } from '@/components/ui/misc'
import { Chip } from '@/components/ui/badges'
import { formatDateTime } from '@/domain/util'
import { useStaticPageMeta } from '@/seo/usePageMeta'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PAGE_META } from '@/seo/siteConfig'

export default function Summary() {
  useStaticPageMeta('summary')
  const { record } = useStore()
  const [copied, setCopied] = useState(false)
  const summary = useMemo(() => composeSummary(record, computeTrends(record.labs)), [record])

  const asText = useMemo(() => {
    const lines: string[] = [`MedLens summary — ${record.demographics.name} (${record.demographics.patientId})`, `Generated ${formatDateTime(summary.generatedAt)}`, '']
    for (const s of summary.sections) {
      lines.push(`## ${s.heading}`)
      for (const l of s.lines) lines.push(l)
      lines.push('')
    }
    lines.push(summary.disclaimer)
    return lines.join('\n')
  }, [summary, record.demographics])

  function download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={PAGE_META.summary.breadcrumbs} />
          <h1 className="text-xl font-semibold text-ink-900">Record summary</h1>
          <p className="text-sm text-ink-500 mt-1">
            Composed deterministically from the structured record and safety-linted before
            display. No language model writes this text, so it can only state what the data
            supports.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(asText); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="btn-secondary" onClick={() => download(`medlens-record-${record.demographics.patientId}.json`, JSON.stringify(record, null, 2), 'application/json')}>
            <Download size={15} /> Record JSON
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Safety status */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <ShieldCheck size={20} className="text-emerald-600" />
        <div className="text-sm text-emerald-900">
          <span className="font-medium">Responsible-AI safety check passed.</span>{' '}
          {summary.violationsCaught === 0
            ? 'No diagnostic, prescriptive, or false-certainty language detected in this summary.'
            : `${summary.violationsCaught} unsafe fragment(s) were caught and withheld.`}
        </div>
        <Chip tone="neutral" className="ml-auto">{summary.violationsCaught} violations</Chip>
      </div>

      {/* Summary card (print target) */}
      <article className="card p-6 print:shadow-none print:border-0">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-ink-100">
          <FileCheck2 size={18} className="text-primary-600" />
          <div>
            <div className="font-semibold text-ink-900">Patient information summary</div>
            <div className="text-xs text-ink-400">
              {record.demographics.name} · {record.demographics.patientId} · generated {formatDateTime(summary.generatedAt)}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {summary.sections.map((s) => (
            <section key={s.heading}>
              <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                {s.heading}
                {!s.safe && <Chip tone="danger" className="scale-90">withheld</Chip>}
              </h3>
              <ul className="mt-1.5 space-y-1">
                {s.lines.map((l, i) => (
                  <li key={i} className={`text-[13.5px] leading-relaxed ${l.startsWith('•') ? 'ml-3 text-ink-600' : 'text-ink-700'}`}>{l}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-ink-100">
          <DisclaimerBar text={summary.disclaimer} />
        </div>
      </article>

      <SectionTitle title="Why you can trust this summary" subtitle="Each guarantee is enforced in code, not just prose." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 print:hidden">
        {[
          ['Built from data', 'The summary is composed from the structured record, so it cannot state anything the data does not support.'],
          ['Safety-linted', 'Every section is scanned for diagnostic / prescriptive language before display; unsafe text is withheld.'],
          ['Source ranges only', 'Findings compare values only to the reference range printed in the source report.'],
          ['Data, not diagnosis', 'Trends describe the reported numbers, never whether the patient improved or worsened.'],
          ['Conflicts surfaced', 'Open disagreements are listed for a human, never silently resolved.'],
          ['Human-verifiable', 'Every value links back to its exact source span in the original document.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-ink-200 p-4">
            <div className="font-medium text-ink-800 text-sm">{t}</div>
            <p className="text-[13px] text-ink-500 mt-1">{d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
