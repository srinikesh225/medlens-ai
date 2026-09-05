/**
 * Extraction-confidence meter.
 *
 * Framed unmissably as EXTRACTION reliability, never medical certainty — the
 * accessible label and the tooltip both say so. The bar is never the only
 * signal: the percentage is always available as text.
 */
export function ConfidenceMeter({
  value,
  showLabel = true,
  className = '',
}: {
  /** 0..1, or undefined when the fact did not come from an extractor. */
  value?: number
  showLabel?: boolean
  className?: string
}) {
  if (value == null) return null
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  // Deliberately NOT the status palette: this is not a clinical judgement.
  const tone = pct >= 95 ? 'bg-accent' : pct >= 85 ? 'bg-secondary' : 'bg-muted'
  const description = `Extraction confidence ${pct}% — not a measure of medical certainty.`

  return (
    <div className={`flex items-center gap-2 ${className}`} title={description}>
      <div
        className="h-1 w-16 rounded-pill bg-sunken overflow-hidden shrink-0"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={description}
      >
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs num text-muted">{pct}%</span>}
    </div>
  )
}
