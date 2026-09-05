/**
 * Trend analysis. We describe what the DATA does across the available reports
 * and stop there. We never translate a trend into a clinical conclusion
 * ("improving", "worsening", "condition resolved"). That line is the difference
 * between an information tool and an unlicensed diagnosis.
 */

import type { LabResult, TrendSeries } from './types'

/** Build one TrendSeries per test that has 2+ numeric readings over time. */
export function computeTrends(labs: LabResult[]): TrendSeries[] {
  const byKey = new Map<string, LabResult[]>()
  for (const l of labs) {
    if (l.valueNum === undefined) continue // only numeric tests trend
    if (l.verification === 'REJECTED') continue
    const arr = byKey.get(l.normalizedKey) ?? []
    arr.push(l)
    byKey.set(l.normalizedKey, arr)
  }

  const series: TrendSeries[] = []
  for (const [key, group] of byKey) {
    // One reading per date (if a date has two, that's a conflict handled elsewhere;
    // for the trend we take the first stable reading).
    const byDate = new Map<string, LabResult>()
    for (const l of group) if (!byDate.has(l.date)) byDate.set(l.date, l)
    const points = [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => ({
        date: l.date,
        value: l.valueNum as number,
        status: l.status,
        resultId: l.id,
      }))

    if (points.length < 2) continue

    series.push({
      normalizedKey: key,
      testName: group[0].testName,
      unit: group[0].unit,
      points,
      ...describe(points.map((p) => p.value)),
    })
  }

  // Most-changed / most-recent first for demo prominence.
  return series.sort((a, b) => b.points.length - a.points.length)
}

/**
 * Neutral, DATA-only description. Returns a direction and a factual note that
 * quotes the numbers — deliberately free of clinical adjectives.
 */
function describe(values: number[]): Pick<TrendSeries, 'direction' | 'dataNote'> {
  if (values.length < 2) return { direction: 'INSUFFICIENT', dataNote: 'Only one reading available.' }

  const first = values[0]
  const last = values[values.length - 1]
  const deltas: number[] = []
  for (let i = 1; i < values.length; i++) deltas.push(values[i] - values[i - 1])

  const allUp = deltas.every((d) => d > 0)
  const allDown = deltas.every((d) => d < 0)
  const scale = Math.max(...values.map((v) => Math.abs(v)), 1e-9)
  const netRel = Math.abs(last - first) / scale

  let direction: TrendSeries['direction']
  if (netRel < 0.02) direction = 'STABLE'
  else if (allUp) direction = 'INCREASING'
  else if (allDown) direction = 'DECREASING'
  else direction = 'MIXED'

  const seq = values.join(' → ')
  const dataNote =
    direction === 'STABLE'
      ? `Reported values were broadly stable across the available reports (${seq}).`
      : direction === 'INCREASING'
        ? `Reported values increased across the available reports (${seq}).`
        : direction === 'DECREASING'
          ? `Reported values decreased across the available reports (${seq}).`
          : `Reported values changed without a single direction across the available reports (${seq}).`

  return { direction, dataNote }
}
