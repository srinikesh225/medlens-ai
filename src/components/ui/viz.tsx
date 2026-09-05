/**
 * Lightweight, dependency-free visualizations (custom SVG — no chart lib).
 *
 * SVG `fill`/`stroke` cannot take a Tailwind class here, so these read the
 * real values from the token module. That keeps a point's colour and its
 * StatusPill label driven by the same source — a status can never be drawn
 * in one colour and labelled as another.
 */
import type { TrendSeries } from '@/domain/types'
import { STATUS_HEX, TOKENS } from '@/design/tokens'

const STATUS_COLOR = STATUS_HEX

export { ConfidenceMeter } from './ConfidenceMeter'

/** A compact inline sparkline with an optional soft area fill. */
export function Sparkline({
  values,
  width = 88,
  height = 26,
  color = TOKENS.secondary,
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
      <line x1={padX} y1={padY + innerH} x2={W - padX} y2={padY + innerH} stroke={TOKENS.border} strokeWidth={1} />
      <line x1={padX} y1={padY} x2={padX} y2={padY + innerH} stroke={TOKENS.border} strokeWidth={1} />
      {/* y labels */}
      <text x={padX - 6} y={padY + 4} textAnchor="end" className="fill-faint" fontSize={9}>{max}</text>
      <text x={padX - 6} y={padY + innerH} textAnchor="end" className="fill-faint" fontSize={9}>{min}</text>
      {/* line */}
      <polyline points={line} fill="none" stroke={TOKENS.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* points colored by source-range status */}
      {series.points.map((p, i) => (
        <g key={p.resultId}>
          <circle cx={x(i)} cy={y(p.value)} r={3.5} fill={STATUS_COLOR[p.status]} stroke={TOKENS.card} strokeWidth={1.5} />
          <text x={x(i)} y={y(p.value) - 8} textAnchor="middle" className="fill-secondary" fontSize={9} fontWeight={600}>
            {p.value}
          </text>
          <text x={x(i)} y={padY + innerH + 12} textAnchor="middle" className="fill-faint" fontSize={8}>
            {p.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  )
}
