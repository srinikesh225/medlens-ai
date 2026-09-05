import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * A single headline number.
 *
 * `tone` maps onto the SEMANTIC status palette only — a stat is never coloured
 * for decoration. `neutral` is the default and the right answer for counts
 * that carry no clinical judgement.
 */
type Tone = 'neutral' | 'normal' | 'low' | 'high' | 'conflict'

const VALUE_TONE: Record<Tone, string> = {
  neutral: 'text-ink',
  normal: 'text-status-normal',
  low: 'text-status-low',
  high: 'text-status-high',
  conflict: 'text-status-conflict',
}

const ICON_TONE: Record<Tone, string> = {
  neutral: 'bg-sunken text-secondary',
  normal: 'bg-status-normal-bg text-status-normal',
  low: 'bg-status-low-bg text-status-low',
  high: 'bg-status-high-bg text-status-high',
  conflict: 'bg-status-conflict-bg text-status-conflict',
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = 'neutral',
  to,
}: {
  label: string
  value: ReactNode
  unit?: string
  hint?: string
  icon?: ReactNode
  tone?: Tone
  /** When set the whole card becomes a link. */
  to?: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-label">{label}</span>
        {icon && (
          <span className={`grid place-items-center h-8 w-8 rounded-md shrink-0 ${ICON_TONE[tone]}`} aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <p className={`text-metric mt-3 ${VALUE_TONE[tone]}`}>
        {value}
        {unit && <span className="text-unit ml-1">{unit}</span>}
      </p>
      {hint && <p className="text-xs text-muted mt-2">{hint}</p>}
    </>
  )

  const shell = 'block bg-card rounded-card border border-border shadow-card p-6'
  if (to) {
    return (
      <Link to={to} className={`${shell} transition-shadow hover:shadow-raised`}>
        {body}
      </Link>
    )
  }
  return <div className={shell}>{body}</div>
}
