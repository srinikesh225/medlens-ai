import { describe, it, expect } from 'vitest'
import { buildDemoRecord, buildTimeline } from './seed'
import { computeTrends } from '@/domain/trends'
import { composeSummary } from '@/domain/summary'
import { lintSafety } from '@/domain/safety'

describe('demo seed integrity', () => {
  const record = buildDemoRecord()

  it('every extracted lab has provenance with a source', () => {
    for (const l of record.labs) {
      expect(l.provenance.sourceType).toBeTruthy()
      expect(l.provenance.reportId).toBeTruthy()
    }
  })

  it('provenance spans point at the real value text in the source report', () => {
    let checked = 0
    for (const l of record.labs) {
      const span = l.provenance.span
      if (!span) continue
      const report = record.reports.find((r) => r.id === span.reportId)!
      const sliced = report.rawText.slice(span.start, span.end)
      expect(sliced).toBe(l.valueRaw)
      checked++
    }
    expect(checked).toBeGreaterThan(10) // most values are source-linked
  })

  it('never invents a reference range: missing ranges are UNKNOWN', () => {
    const ferritin = record.labs.find((l) => l.testName === 'Ferritin')!
    expect(ferritin.referenceRange.unavailable).toBe(true)
    expect(ferritin.status).toBe('UNKNOWN')
  })

  it('computes the expected status for a known value', () => {
    const wbc = record.labs.find((l) => l.testName === 'WBC Count' && l.reportId === 'rep_cbc_jul')!
    expect(wbc.status).toBe('HIGH') // 11.8 vs 4.0-11.0
    const chol = record.labs.find((l) => l.testName === 'Total Cholesterol')!
    expect(chol.status).toBe('HIGH') // 214 vs < 200
  })

  it('surfaces the seeded conflicts (value mismatch, unit mismatch, allergy overlap)', () => {
    const kinds = record.conflicts.map((c) => c.kind)
    expect(kinds).toContain('VALUE_MISMATCH')
    expect(kinds).toContain('UNIT_MISMATCH')
    expect(kinds).toContain('ALLERGY_INCONSISTENCY')
  })

  it('produces a hemoglobin trend across dates (12.1 -> 12.8 -> 13.2)', () => {
    const trends = computeTrends(record.labs)
    const hgb = trends.find((t) => t.testName === 'Hemoglobin')!
    expect(hgb.points.map((p) => p.value)).toEqual([12.1, 12.8, 13.2])
    expect(hgb.direction).toBe('INCREASING')
  })

  it('builds a chronological timeline ending in the review event', () => {
    const tl = buildTimeline(record)
    expect(tl[tl.length - 1].kind).toBe('REVIEW')
    for (let i = 1; i < tl.length; i++) {
      expect(tl[i].date >= tl[i - 1].date).toBe(true)
    }
  })

  it('the composed summary is provably safe (zero violations) and carries the disclaimer', () => {
    const summary = composeSummary(record, computeTrends(record.labs))
    expect(summary.violationsCaught).toBe(0)
    expect(summary.disclaimer).toMatch(/does not provide a medical diagnosis/i)
    for (const section of summary.sections) {
      expect(lintSafety(section.lines.join(' '))).toHaveLength(0)
    }
  })
})
