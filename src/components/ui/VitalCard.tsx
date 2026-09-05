import type { LucideIcon } from 'lucide-react'
import type { RangeStatus } from '@/domain/types'
import { Sparkline } from './viz'

/**
 * A "vitals"-style metric card (Medcure-inspired): tinted icon chip, a status
 * pill with a colored dot, a large value + unit, and a mini sparkline built from
 * the test's REAL reported values over time. No invented data — the sparkline is
 * only shown when the record actually contains multiple readings.
 */

const STATUS_DOT: Record<RangeStatus, { dot: string; text: string; label: string }> = {
  WITHIN_RANGE: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Within range' },
  HIGH: { dot: 'bg-red-500', text: 'text-red-700', label: 'High' },
  LOW: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'Low' },
  UNKNOWN: { dot: 'bg-stone-400', text: 'text-stone-600', label: 'No range' },
  UNEVALUABLE: { dot: 'bg-stone-400', text: 'text-stone-600', label: 'Not evaluable' },
}

const SPARK_COLOR: Record<RangeStatus, string> = {
  WITHIN_RANGE: '#2a888f',
  HIGH: '#f43f5e',
  LOW: '#2563eb',
  UNKNOWN: '#a8a29e',
  UNEVALUABLE: '#a8a29e',
}

export function VitalCard({
  icon: Icon,
  title,
  value,
  unit,
  status,
  series,
  caption,
}: {
  icon: LucideIcon
  title: string
  value: string
  unit?: string
  status: RangeStatus
  series?: number[]
  caption?: string
}) {
  const s = STATUS_DOT[status]
  return (
    <div className="card-lg p-4 flex flex-col">
      <div className="flex items-start justify-between">
        <span className="icon-chip bg-vital-50 text-vital-500">
          <Icon size={17} />
        </span>
        <span className={`chip bg-white border border-ink-200/70 ${s.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
          {s.label}
        </span>
      </div>
      <div className="mt-3 text-[13px] text-ink-500">{title}</div>
      <div className="mt-0.5 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-[26px] leading-none font-bold tabular-nums text-ink-900">{value}</span>
          {unit && <span className="text-sm text-ink-400">{unit}</span>}
        </div>
        {series && series.length > 1 && (
          <Sparkline values={series} color={SPARK_COLOR[status]} fill width={84} height={30} />
        )}
      </div>
      {caption && <div className="mt-2 text-[11px] text-ink-400">{caption}</div>}
    </div>
  )
}
