import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  HeartPulse,
  Stethoscope,
  Pill,
} from 'lucide-react'
import { useStore } from '@/store/store'
import { recordStats, badgeForLab } from '@/store/selectors'
import { buildTimeline } from '@/demo/seed'
import {
  Card,
  SectionHeader,
  ButtonLink,
  DataTable,
  StatusPill,
  ProvenanceBadge,
  type Column,
} from '@/components/ui'
import { DisclaimerBar } from '@/components/ui/misc'
import { SAFETY_DISCLAIMER } from '@/domain/safety'
import { NO_RANGE_MESSAGE } from '@/domain/referenceRange'
import { formatDate, NOT_IN_SOURCE } from '@/domain/util'
import { useStaticPageMeta } from '@/seo/usePageMeta'
import type { LabResult } from '@/domain/types'

export default function Dashboard() {
  useStaticPageMeta('dashboard')
  const { record } = useStore()
  const stats = recordStats(record)
  const timeline = buildTimeline(record)
  const d = record.demographics

  const recentLabs = [...record.labs]
    .filter((l) => l.verification !== 'REJECTED')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  const columns: Column<LabResult>[] = [
    {
      key: 'test',
      header: 'Test / source',
      render: (l) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{l.testName}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <ProvenanceBadge type={badgeForLab(l, record.conflicts)} />
            <Link to={`/reports/${l.reportId}`} className="text-xs text-accent hover:underline num whitespace-nowrap">
              {formatDate(l.date)}
            </Link>
          </div>
        </div>
      ),
    },
    {
      // Value and the range it was checked against belong together: the range
      // is the entire basis of the status, and MedLens only ever uses the one
      // printed in the source.
      key: 'result',
      header: 'Result / reference',
      numeric: true,
      render: (l) => (
        <div>
          <p className="font-medium text-ink">
            {l.valueRaw}
            {l.unit && <span className="text-unit ml-1">{l.unit}</span>}
          </p>
          {l.referenceRange.unavailable ? (
            <p className="text-xs text-muted mt-1">{NO_RANGE_MESSAGE}</p>
          ) : (
            <p className="text-xs text-muted mt-1">ref {l.referenceRange.raw}</p>
          )}
        </div>
      ),
    },
    { key: 'status', header: 'Status', align: 'right', render: (l) => <StatusPill status={l.status} /> },
  ]

  return (
    <div className="space-y-10">
      <SectionHeader
        level={1}
        eyebrow="Overview"
        title="Patient overview"
        description="MedLens turns fragmented medical reports into one structured, source-traceable record a clinician can review — it organizes information, it does not diagnose."
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* ---------------------------------------------------- centre column */}
        {/* Loudest. Everything a human is being asked to look at.             */}
        <div className="min-w-0 space-y-8 lg:col-span-6 lg:col-start-4 lg:row-start-1">
          <Card tone="primary">
            <SectionHeader
              title="Needs a human"
              description="MedLens surfaces these. It never resolves them on your behalf."
              action={
                <ButtonLink to="/review" variant="ghost" size="sm">
                  Review <ArrowRight size={14} aria-hidden />
                </ButtonLink>
              }
            />
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <Attention
                to="/review"
                count={stats.openConflicts}
                label="Open conflicts"
                hint="Sources disagree about the same fact."
                valueClass="text-status-conflict"
                iconClass="bg-status-conflict-bg text-status-conflict"
                icon={<AlertTriangle size={16} aria-hidden />}
              />
              <Attention
                to="/review"
                count={stats.missingRange}
                label="No reference range"
                hint="The source printed none, so none was assumed."
                valueClass="text-status-unknown"
                iconClass="bg-status-unknown-bg text-status-unknown"
                icon={<HelpCircle size={16} aria-hidden />}
              />
              <Attention
                to="/review"
                count={stats.verified}
                label="Human verified"
                hint={`of ${stats.totalLabs} extracted values.`}
                valueClass="text-status-normal"
                iconClass="bg-status-normal-bg text-status-normal"
                icon={<ShieldCheck size={16} aria-hidden />}
              />
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-6 pb-4">
              <SectionHeader
                title="Recent lab results"
                description="Status is computed only against the range printed in each source."
                action={
                  <ButtonLink to="/review" variant="ghost" size="sm">
                    All values <ArrowRight size={14} aria-hidden />
                  </ButtonLink>
                }
              />
            </div>
            <DataTable
              caption="The six most recent laboratory values on file, with source, reference range and review status."
              columns={columns}
              rows={recentLabs}
              rowKey={(l) => l.id}
              empty={{ title: 'No values yet', hint: 'Upload a report to populate the record.' }}
            />
          </Card>
        </div>

        {/* ------------------------------------------------------ left column */}
        <div className="min-w-0 space-y-8 lg:col-span-3 lg:col-start-1 lg:row-start-1">
          <Card>
            <p className="text-label">Patient</p>
            <div className="mt-4 flex items-center gap-3">
              <span
                className="grid place-items-center h-12 w-12 rounded-pill bg-sunken text-ink font-semibold shrink-0"
                aria-hidden
              >
                {d.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink">{d.name}</p>
                <p className="text-xs text-muted num mt-1">{d.patientId}</p>
              </div>
            </div>
            <dl className="mt-6 space-y-3">
              <Field label="Age" value={d.age ? `${d.age}` : undefined} />
              <Field label="Sex" value={d.sex} />
              <Field label="Reports on file" value={`${stats.reports}`} />
            </dl>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
              <ProvenanceBadge type="USER_PROVIDED" />
              <Link to="/patient" className="text-xs text-accent hover:underline">
                Full profile
              </Link>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Clinical background" />
            <div className="mt-6 space-y-6">
              <Group
                icon={<HeartPulse size={14} aria-hidden />}
                title="Conditions"
                badge="USER_PROVIDED"
                items={record.conditions.map((c) => c.name)}
              />
              <Group
                icon={<Stethoscope size={14} aria-hidden />}
                title="Allergies"
                badge="USER_PROVIDED"
                items={record.allergies.map((a) => `${a.substance}${a.reaction ? ` (${a.reaction})` : ''}`)}
              />
              <Group
                icon={<Pill size={14} aria-hidden />}
                title="Medications"
                badge="DOCUMENT_EXTRACTED"
                items={record.medications.map(
                  (m) => `${m.name}${m.dose ? ` ${m.dose}` : ` — ${NOT_IN_SOURCE}`}${m.status !== 'ACTIVE' ? ` · ${m.status.toLowerCase()}` : ''}`,
                )}
              />
            </div>
          </Card>
        </div>

        {/* ----------------------------------------------------- right column */}
        {/* Quietest. Context you glance at, not something to act on.          */}
        <aside className="min-w-0 lg:col-span-3 lg:col-start-10 lg:row-start-1">
          <Card as="div">
            <SectionHeader title="Timeline" />
            <ol className="mt-6 space-y-5 border-l border-border pl-5">
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-6 top-2 h-2 w-2 rounded-pill bg-faint" aria-hidden />
                  <p className="text-xs text-muted num">{formatDate(e.date)}</p>
                  <p className="text-sm text-secondary mt-1">{e.title}</p>
                </li>
              ))}
            </ol>
            <Link to="/timeline" className="mt-6 inline-flex items-center gap-2 text-xs text-accent hover:underline">
              Timeline &amp; trends <ArrowRight size={12} aria-hidden />
            </Link>
          </Card>
        </aside>
      </div>

      <DisclaimerBar text={SAFETY_DISCLAIMER} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Attention({
  count,
  label,
  hint,
  icon,
  valueClass,
  iconClass,
  to,
}: {
  count: number
  label: string
  hint: string
  icon: ReactNode
  valueClass: string
  iconClass: string
  to: string
}) {
  return (
    <Link to={to} className="block rounded-md -m-2 p-2 hover:bg-sunken transition-colors">
      <span className={`grid place-items-center h-8 w-8 rounded-md ${iconClass}`}>{icon}</span>
      <p className={`text-metric mt-4 ${valueClass}`}>{count}</p>
      <p className="text-sm font-medium text-ink mt-1">{label}</p>
      <p className="text-xs text-muted mt-2">{hint}</p>
    </Link>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  // A missing sub-field is shown as missing, never omitted — hiding it would
  // let the reader assume the record is more complete than it is.
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={value ? 'text-sm text-ink num' : 'text-xs text-muted'}>{value || NOT_IN_SOURCE}</dd>
    </div>
  )
}

function Group({
  icon,
  title,
  items,
  badge,
}: {
  icon: ReactNode
  title: string
  items: string[]
  badge: 'USER_PROVIDED' | 'DOCUMENT_EXTRACTED'
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-muted">{icon}</span>
        <span className="text-label">{title}</span>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="text-sm text-secondary">
              {it}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">None recorded.</p>
      )}
      <div className="mt-3">
        <ProvenanceBadge type={badge} />
      </div>
    </div>
  )
}
