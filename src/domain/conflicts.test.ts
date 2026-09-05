import { describe, it, expect } from 'vitest'
import { detectConflicts } from './conflicts'
import type { Allergy, LabResult, Medication, Report } from './types'
import { normalizeKey } from './util'

function lab(partial: Partial<LabResult> & { testName: string; valueNum: number; date: string }): LabResult {
  return {
    id: partial.id ?? Math.random().toString(36),
    reportId: partial.reportId ?? 'r1',
    testName: partial.testName,
    normalizedKey: normalizeKey(partial.testName),
    valueRaw: String(partial.valueNum),
    valueNum: partial.valueNum,
    unit: partial.unit,
    referenceRange: partial.referenceRange ?? { raw: '', unavailable: true },
    status: partial.status ?? 'UNKNOWN',
    date: partial.date,
    provenance: partial.provenance ?? { sourceType: 'DOCUMENT_EXTRACTED', reportTitle: 'Report' },
    verification: partial.verification ?? 'UNREVIEWED',
    notes: [],
  }
}

const empty = { labs: [], medications: [], allergies: [], reports: [], conflicts: [] }

describe('value mismatch', () => {
  it('flags same test + same date with materially different values', () => {
    const labs = [
      lab({ testName: 'Hemoglobin', valueNum: 12.1, date: '2026-08-02', reportId: 'a', provenance: { sourceType: 'DOCUMENT_EXTRACTED', reportTitle: 'Report A' } }),
      lab({ testName: 'Hemoglobin', valueNum: 14.2, date: '2026-08-02', reportId: 'b', provenance: { sourceType: 'DOCUMENT_EXTRACTED', reportTitle: 'Report B' } }),
    ]
    const conflicts = detectConflicts({ ...empty, labs })
    expect(conflicts.some((c) => c.kind === 'VALUE_MISMATCH')).toBe(true)
  })

  it('does NOT flag the same test on DIFFERENT dates (that is a trend, not a conflict)', () => {
    const labs = [
      lab({ testName: 'Hemoglobin', valueNum: 12.1, date: '2026-08-02' }),
      lab({ testName: 'Hemoglobin', valueNum: 14.2, date: '2026-09-01' }),
    ]
    const conflicts = detectConflicts({ ...empty, labs })
    expect(conflicts.some((c) => c.kind === 'VALUE_MISMATCH')).toBe(false)
  })

  it('does NOT flag cross-unit values as a value mismatch (that is a unit mismatch)', () => {
    const labs = [
      lab({ testName: 'Glucose', valueNum: 96, unit: 'mg/dL', date: '2026-09-01' }),
      lab({ testName: 'Glucose', valueNum: 5.6, unit: 'mmol/L', date: '2026-09-01' }),
    ]
    const conflicts = detectConflicts({ ...empty, labs })
    expect(conflicts.some((c) => c.kind === 'VALUE_MISMATCH')).toBe(false)
    expect(conflicts.some((c) => c.kind === 'UNIT_MISMATCH')).toBe(true)
  })

  it('does not flag tiny (immaterial) differences', () => {
    const labs = [
      lab({ testName: 'Sodium', valueNum: 140.0, date: '2026-08-02' }),
      lab({ testName: 'Sodium', valueNum: 140.1, date: '2026-08-02' }),
    ]
    expect(detectConflicts({ ...empty, labs }).some((c) => c.kind === 'VALUE_MISMATCH')).toBe(false)
  })
})

describe('unit mismatch', () => {
  it('flags the same test reported in different units', () => {
    const labs = [
      lab({ testName: 'Glucose', valueNum: 90, unit: 'mg/dL', date: '2026-08-02' }),
      lab({ testName: 'Glucose', valueNum: 5.0, unit: 'mmol/L', date: '2026-09-01' }),
    ]
    expect(detectConflicts({ ...empty, labs }).some((c) => c.kind === 'UNIT_MISMATCH')).toBe(true)
  })
})

describe('duplicate report', () => {
  it('flags two uploads with the same lab, date and kind', () => {
    const reports: Report[] = [
      { id: 'r1', title: 'CBC', kind: 'LAB', labName: 'Acme Labs', reportDate: '2026-08-02', uploadedAt: '', mimeType: 'application/pdf', rawText: '', pageBreaks: [0], stage: 'READY', progress: 100, extractionModel: 'x' },
      { id: 'r2', title: 'CBC copy', kind: 'LAB', labName: 'Acme Labs', reportDate: '2026-08-02', uploadedAt: '', mimeType: 'application/pdf', rawText: '', pageBreaks: [0], stage: 'READY', progress: 100, extractionModel: 'x' },
    ]
    expect(detectConflicts({ ...empty, reports }).some((c) => c.kind === 'DUPLICATE_REPORT')).toBe(true)
  })
})

describe('allergy / medication overlap (review flag, not advice)', () => {
  it('flags a medication whose name matches a recorded allergy', () => {
    const allergies: Allergy[] = [
      { id: 'a1', substance: 'Penicillin', provenance: { sourceType: 'USER_PROVIDED' }, verification: 'VERIFIED' },
    ]
    const medications: Medication[] = [
      { id: 'm1', name: 'Penicillin V', status: 'ACTIVE', provenance: { sourceType: 'DOCUMENT_EXTRACTED' }, verification: 'UNREVIEWED' },
    ]
    const conflicts = detectConflicts({ ...empty, allergies, medications })
    const flag = conflicts.find((c) => c.kind === 'ALLERGY_INCONSISTENCY')
    expect(flag).toBeTruthy()
    // must NOT contain prescriptive language
    expect(flag!.summary.toLowerCase()).not.toMatch(/do not (give|take|use)/)
  })
})

describe('impossible chronology', () => {
  it('flags a value dated after the review date', () => {
    const labs = [lab({ testName: 'TSH', valueNum: 2.1, date: '2027-01-01' })]
    const conflicts = detectConflicts({ ...empty, labs }, '2026-09-05T00:00:00Z')
    expect(conflicts.some((c) => c.kind === 'IMPOSSIBLE_CHRONOLOGY')).toBe(true)
  })
})

describe('resolution is preserved and never auto-decided', () => {
  it('carries forward a human RESOLVED state on re-scan', () => {
    const labs = [
      lab({ testName: 'Hemoglobin', valueNum: 12.1, date: '2026-08-02', reportId: 'a' }),
      lab({ testName: 'Hemoglobin', valueNum: 14.2, date: '2026-08-02', reportId: 'b' }),
    ]
    const first = detectConflicts({ ...empty, labs })
    const resolved = first.map((c) => ({ ...c, status: 'RESOLVED' as const, resolutionNote: 'Report B is authoritative.' }))
    const second = detectConflicts({ ...empty, labs, conflicts: resolved })
    expect(second[0].status).toBe('RESOLVED')
    expect(second[0].resolutionNote).toContain('authoritative')
  })
})
