/** Lightweight, dependency-free visualizations (custom SVG — no chart lib). */
import type { RangeStatus, TrendSeries } from '@/domain/types'

const STATUS_COLOR: Record<RangeStatus, string> = {
  LOW: '#1d4ed8',
  WITHIN_RANGE: '#047857',
  HIGH: '#b91c1c',
  UNKNOWN: '#78716c',
  UNEVALUABLE: '#78716c',
}

/**
 * Extraction confidence meter. Explicitly framed as extraction reliability,
 * NOT medical certainty (the label makes this unmissable).
 */
export function ConfidenceMeter({ value, showLabel = true }: { value?: number; showLabel?: boolean }) {
  if (value == null) return null
  const pct = Math.round(value * 100)
  const tone = pct >= 95 ? 'bg-emerald-500' : pct >= 85 ? 'bg-primary-500' : 'bg-amber-500'
  return (
    <div className="flex items-center gap-2" title="Extraction confidence — not a measure of medical certainty.">
      <div className="h-1.5 w-16 rounded-full bg-ink-100 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs tabular-nums text-ink-500">{pct}%</span>}
    </div>
  )
}

/** A compact inline sparkline with an optional soft area fill. */
export function Sparkline({
  values,
  width = 88,
  height = 26,
  color = '#2a888f',
  fill = false,
}: {
  values: number[]
  width?: number
  height?: number
  color?: string
  fill?: boolean
}) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)
  const coords = values.map((v, i) => [i * step, height - ((v - min) / range) * (height - 5) - 3] as const)
  const pts = coords.map(([x, y]) => `${x},${y}`)
  const gid = `sl-${Math.random().toString(36).slice(2, 8)}`
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${height} ${pts.join(' ')} ${width},${height}`} fill={`url(#${gid})`} />
        </>
      )}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={2.6} fill={color} />
    </svg>
  )
}

/** A labelled trend chart for a single test over time. */
export function TrendChart({ series }: { series: TrendSeries }) {
  const W = 320
  const H = 120
  const padX = 34
  const padY = 18
  const values = series.points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const x = (i: number) => padX + (series.points.length === 1 ? innerW / 2 : (i / (series.points.length - 1)) * innerW)
  const y = (v: number) => padY + innerH - ((v - min) / range) * innerH
  const line = series.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${series.testName} trend`}>
      {/* baseline */}
      <line x1={padX} y1={padY + innerH} x2={W - padX} y2={padY + innerH} stroke="#e5e9ef" strokeWidth={1} />
      <line x1={padX} y1={padY} x2={padX} y2={padY + innerH} stroke="#e5e9ef" strokeWidth={1} />
      {/* y labels */}
      <text x={padX - 6} y={padY + 4} textAnchor="end" className="fill-ink-400" fontSize={9}>{max}</text>
      <text x={padX - 6} y={padY + innerH} textAnchor="end" className="fill-ink-400" fontSize={9}>{min}</text>
      {/* line */}
      <polyline points={line} fill="none" stroke="#2a888f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* points colored by source-range status */}
      {series.points.map((p, i) => (
        <g key={p.resultId}>
          <circle cx={x(i)} cy={y(p.value)} r={3.5} fill={STATUS_COLOR[p.status]} stroke="#fff" strokeWidth={1.5} />
          <text x={x(i)} y={y(p.value) - 8} textAnchor="middle" className="fill-ink-700" fontSize={9} fontWeight={600}>
            {p.value}
          </text>
          <text x={x(i)} y={padY + innerH + 12} textAnchor="middle" className="fill-ink-400" fontSize={8}>
            {p.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  )
}
