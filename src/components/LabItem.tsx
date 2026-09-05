import { type ReactNode } from 'react'
import { Crosshair, StickyNote } from 'lucide-react'
import type { Conflict, LabResult } from '@/domain/types'
import { NO_RANGE_MESSAGE } from '@/domain/referenceRange'
import { formatDate } from '@/domain/util'
import { ProvenanceBadge, StatusPill, VerificationPill } from './ui/badges'
import { ConfidenceMeter } from './ui/viz'
import { badgeForLab } from '@/store/selectors'

/**
 * The canonical presentation of one structured lab value. Mirrors the spec's
 * example: value + unit, the SOURCE reference range (or the honest
 * "not provided" message), the computed status, provenance and confidence.
 */
export function LabItem({
  lab,
  conflicts,
  onViewSource,
  actions,
  active = false,
}: {
  lab: LabResult
  conflicts: Conflict[]
  onViewSource?: (lab: LabResult) => void
  actions?: ReactNode
  active?: boolean
}) {
  const rejected = lab.verification === 'REJECTED'
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        active ? 'border-primary-400 bg-primary-50/40 shadow-card' : 'border-ink-200 bg-white'
      } ${rejected ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-ink-900">{lab.testName}</span>
            <StatusPill status={lab.status} />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-2xl font-semibold tabular-nums ${rejected ? 'line-through' : ''}`}>
              {lab.valueRaw}
            </span>
            {lab.unit && <span className="text-sm text-ink-500">{lab.unit}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <ConfidenceMeter value={lab.provenance.confidence} />
          <div className="text-[11px] text-ink-400 mt-1">extraction confidence</div>
        </div>
      </div>

      {/* Reference range — always from the source, never invented. */}
      <div className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-[13px]">
        <div className="flex justify-between gap-3">
          <span className="text-ink-500">Reference (from source)</span>
          <span className={`font-medium ${lab.referenceRange.unavailable ? 'text-stone-500' : 'text-ink-800'}`}>
            {lab.referenceRange.unavailable
              ? lab.referenceRange.raw
                ? `${lab.referenceRange.raw} (not numerically comparable)`
                : NO_RANGE_MESSAGE
              : lab.referenceRange.raw}
          </span>
        </div>
        {lab.observation && (
          <div className="mt-1.5 text-ink-500">
            <span className="text-ink-400">Observation: </span>
            {lab.observation}
          </div>
        )}
      </div>

      {/* Provenance line */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <ProvenanceBadge type={badgeForLab(lab, conflicts)} />
        <VerificationPill state={lab.verification} />
        <span className="text-xs text-ink-400">
          {lab.provenance.reportTitle} · {formatDate(lab.date)}
        </span>
        {onViewSource && lab.provenance.span && (
          <button
            className="btn-ghost ml-auto px-2 py-1 text-xs text-primary-700"
            onClick={() => onViewSource(lab)}
          >
            <Crosshair size={13} /> View source
          </button>
        )}
      </div>

      {lab.notes.length > 0 && (
        <div className="mt-2 space-y-1">
          {lab.notes.map((n, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[13px] text-ink-600">
              <StickyNote size={13} className="mt-0.5 text-ink-400 shrink-0" />
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}

      {actions && <div className="mt-3 pt-3 border-t border-ink-100 flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
