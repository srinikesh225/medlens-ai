import { describe, it, expect } from 'vitest'
import { computeTrends } from './trends'
import type { LabResult } from './types'
import { normalizeKey } from './util'

function lab(testName: string, valueNum: number, date: string): LabResult {
  return {
    id: Math.random().toString(36),
    reportId: 'r',
    testName,
    normalizedKey: normalizeKey(testName),
    valueRaw: String(valueNum),
    valueNum,
    referenceRange: { raw: '', unavailable: true },
    status: 'UNKNOWN',
    date,
    provenance: { sourceType: 'DOCUMENT_EXTRACTED' },
    verification: 'UNREVIEWED',
    notes: [],
  }
}

describe('computeTrends', () => {
  it('needs at least two readings', () => {
    expect(computeTrends([lab('Hemoglobin', 13, '2026-08-02')])).toHaveLength(0)
  })

  it('describes an increasing series with the DATA, not a clinical claim', () => {
    const t = computeTrends([
      lab('Hemoglobin', 12.1, '2026-08-02'),
      lab('Hemoglobin', 12.8, '2026-08-19'),
      lab('Hemoglobin', 13.2, '2026-09-01'),
    ])
    expect(t).toHaveLength(1)
    expect(t[0].direction).toBe('INCREASING')
    expect(t[0].dataNote).toMatch(/increased/i)
    // must not editorialize about health
    expect(t[0].dataNote.toLowerCase()).not.toMatch(/improv|better|worse|healthier|recover/)
  })

  it('orders points chronologically regardless of input order', () => {
    const t = computeTrends([
      lab('TSH', 3.0, '2026-09-01'),
      lab('TSH', 2.0, '2026-08-02'),
    ])
    expect(t[0].points.map((p) => p.date)).toEqual(['2026-08-02', '2026-09-01'])
  })

  it('classifies a flat series as stable', () => {
    const t = computeTrends([
      lab('Sodium', 140, '2026-08-02'),
      lab('Sodium', 140, '2026-09-01'),
    ])
    expect(t[0].direction).toBe('STABLE')
  })
})
