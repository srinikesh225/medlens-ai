import { Link } from 'react-router-dom'
import {
  FileText,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Stethoscope,
  Pill,
  HeartPulse,
  Droplet,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/store'
import { recordStats } from '@/store/selectors'
import { computeTrends } from '@/domain/trends'
import { buildTimeline } from '@/demo/seed'
import { Stat, SectionTitle, DisclaimerBar } from '@/components/ui/misc'
import { StatusPill, ProvenanceBadge, Chip } from '@/components/ui/badges'
import { TrendChart } from '@/components/ui/viz'
import { VitalCard } from '@/components/ui/VitalCard'
import { SAFETY_DISCLAIMER } from '@/domain/safety'
import { badgeForLab } from '@/store/selectors'
import { formatDate } from '@/domain/util'
import { useUploadModal } from '@/App'
import { useStaticPageMeta } from '@/seo/usePageMeta'

export default function Dashboard() {
  useStaticPageMeta('dashboard')
  const { record } = useStore()
  const stats = recordStats(record)
  const trends = computeTrends(record.labs)
  const timeline = buildTimeline(record)
  const featured = trends.find((t) => t.testName === 'Hemoglobin') ?? trends[0]
  const { open } = useUploadModal()

  const vitalIcons: Record<string, LucideIcon> = {
    hemoglobin: Droplet,
    'wbc count': Activity,
    'platelet count': Activity,
    'total cholesterol': HeartPulse,
  }
  const vitals = trends.slice(0, 4).map((t) => {
    const last = t.points[t.points.length - 1]
    return {
      key: t.normalizedKey,
      icon: vitalIcons[t.normalizedKey] ?? Droplet,
      title: t.testName,
      value: String(last.value),
      unit: t.unit,
      status: last.status,
      series: t.points.map((p) => p.value),
      caption: `${t.points.length} readings · latest ${formatDate(last.date)}`,
    }
  })

  const recentLabs = [...record.labs]
    .filter((l) => l.verification !== 'REJECTED')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-[34px] font-bold tracking-tight text-ink-900">Patient overview</h1>
        <p className="text-sm text-ink-500 mt-1.5">
          A structured, source-traceable view of everything MedLens has organized for this patient.
        </p>
      </div>

      {/* Recent vitals — real values + real sparklines from repeated readings */}
      {vitals.length > 0 && (
        <div>
          <SectionTitle title="Recent vitals" subtitle="Latest reading and how it moved — status is from the source range only." />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {vitals.map((v) => (
              <VitalCard key={v.key} icon={v.icon} title={v.title} value={v.value} unit={v.unit} status={v.status} series={v.series} caption={v.caption} />
            ))}
          </div>
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Reports" value={stats.reports} icon={<FileText size={16} />} />
        <Stat label="Values extracted" value={stats.totalLabs} icon={<FlaskConical size={16} />} />
        <Stat label="Verified" value={`${stats.verifiedPct}%`} tone="good" icon={<ShieldCheck size={16} />} hint={`${stats.verified} of ${stats.totalLabs} values`} />
        <Stat label="Open conflicts" value={stats.openConflicts} tone={stats.openConflicts ? 'danger' : 'good'} icon={<AlertTriangle size={16} />} />
      </div>

      {/* Attention panel */}
      <div className="card p-5">
        <SectionTitle
          title="Attention"
          subtitle="What MedLens flagged for a human to look at."
          right={<Link to="/review" className="btn-ghost text-primary-700 text-sm">Go to review <ArrowRight size={15} /></Link>}
        />
        <div className="grid sm:grid-cols-3 gap-3">
          <AttnCard tone="danger" count={stats.openConflicts} label="potential conflict(s)" hint="Different values / units / statuses for the same concept." to="/review" />
          <AttnCard tone="warn" count={stats.missingRange} label="value(s) missing a reference range" hint="Left un-range-checked — never guessed." to="/review" />
          <AttnCard tone="neutral" count={stats.unreviewed} label="value(s) awaiting review" hint="Extracted but not yet human-verified." to="/review" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Key information */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-5">
            <SectionTitle title="Key information" />
            <KeyBlock icon={<HeartPulse size={15} />} title="Conditions" items={record.conditions.map((c) => c.name)} badge="USER_PROVIDED" />
            <KeyBlock icon={<Stethoscope size={15} />} title="Allergies" items={record.allergies.map((a) => `${a.substance}${a.reaction ? ` (${a.reaction})` : ''}`)} badge="USER_PROVIDED" />
            <KeyBlock
              icon={<Pill size={15} />}
              title="Medications"
              items={record.medications.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ''}${m.status !== 'ACTIVE' ? ` · ${m.status.toLowerCase()}` : ''}`)}
              badge="DOCUMENT_EXTRACTED"
              last
            />
          </div>

          {featured && (
            <div className="card p-5">
              <SectionTitle title={`Trend · ${featured.testName}`} subtitle="Reported values over time (data only)." />
              <TrendChart series={featured} />
              <p className="text-[13px] text-ink-500 mt-2">{featured.dataNote}</p>
            </div>
          )}
        </div>

        {/* Recent lab results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="px-5 pt-5">
              <SectionTitle title="Recent lab results" subtitle="Status is computed only against the range printed in each source." />
            </div>
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-400 text-xs border-y border-ink-100">
                    <th className="font-medium px-5 py-2">Test</th>
                    <th className="font-medium px-3 py-2">Result</th>
                    <th className="font-medium px-3 py-2">Reference (source)</th>
                    <th className="font-medium px-3 py-2">Status</th>
                    <th className="font-medium px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLabs.map((l) => (
                    <tr key={l.id} className="border-b border-ink-50 hover:bg-ink-50/60">
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-ink-800">{l.testName}</div>
                        <div className="mt-0.5"><ProvenanceBadge type={badgeForLab(l, record.conflicts)} /></div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">{l.valueRaw} <span className="text-ink-400">{l.unit}</span></td>
                      <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap">
                        {l.referenceRange.unavailable ? <span className="text-stone-400">not in source</span> : l.referenceRange.raw}
                      </td>
                      <td className="px-3 py-2.5"><StatusPill status={l.status} /></td>
                      <td className="px-3 py-2.5">
                        <Link to={`/reports/${l.reportId}`} className="text-primary-700 hover:underline text-xs whitespace-nowrap">
                          {formatDate(l.date)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline strip */}
          <div className="card p-5">
            <SectionTitle title="Timeline" subtitle="Chronology of everything on file." right={<Link to="/timeline" className="btn-ghost text-primary-700 text-sm">Open timeline <ArrowRight size={15} /></Link>} />
            <ol className="flex gap-3 overflow-x-auto scroll-thin pb-2">
              {timeline.map((e) => (
                <li key={e.id} className="min-w-[150px] rounded-lg border border-ink-200 p-3">
                  <div className="text-xs text-ink-400">{formatDate(e.date)}</div>
                  <div className="text-sm font-medium text-ink-800 mt-0.5 line-clamp-2">{e.title}</div>
                  <div className="text-xs text-ink-500 mt-1">{e.summary}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-primary-200 bg-primary-50/60 p-4">
        <div className="text-sm text-primary-900">
          <span className="font-medium">Try the live pipeline.</span> Upload a sample report and watch it become a structured, source-linked record.
        </div>
        <button className="btn-primary shrink-0" onClick={() => open()}>Upload report</button>
      </div>

      <DisclaimerBar text={SAFETY_DISCLAIMER} />
    </div>
  )
}

function AttnCard({ tone, count, label, hint, to }: { tone: 'danger' | 'warn' | 'neutral'; count: number; label: string; hint: string; to: string }) {
  const tones = {
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    neutral: 'border-ink-200 bg-ink-50 text-ink-700',
  }
  return (
    <Link to={to} className={`block rounded-xl border p-4 hover:shadow-card transition-shadow ${tones[tone]}`}>
      <div className="text-2xl font-semibold tabular-nums">{count}</div>
      <div className="text-sm font-medium mt-0.5">{label}</div>
      <div className="text-xs opacity-80 mt-1">{hint}</div>
    </Link>
  )
}

function KeyBlock({ icon, title, items, badge, last }: { icon: React.ReactNode; title: string; items: string[]; badge: 'USER_PROVIDED' | 'DOCUMENT_EXTRACTED'; last?: boolean }) {
  return (
    <div className={`py-3 ${last ? '' : 'border-b border-ink-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="icon-chip h-7 w-7 rounded-lg bg-primary-50 text-primary-600">{icon}</span>
        <span className="text-sm font-medium text-ink-700">{title}</span>
        <ProvenanceBadge type={badge} className="ml-auto scale-90" />
      </div>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="text-[13px] text-ink-700 flex items-start gap-1.5">
              <Chip tone="neutral" className="px-1.5 py-0 mt-0.5 scale-90">•</Chip>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-400">None recorded.</p>
      )}
    </div>
  )
}
