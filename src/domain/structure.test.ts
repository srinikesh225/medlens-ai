import { describe, it, expect } from 'vitest'
import { structureLabs, structureManualLabs, assertSourced } from './structure'
import type { LabResult, Report } from './types'
import type { ExtractionOutput } from '@/llm/schema'

const report: Report = {
  id: 'rep_x',
  title: 'Test Report',
  kind: 'LAB',
  labName: 'Acme',
  reportDate: '2026-09-01',
  uploadedAt: '2026-09-01T09:00:00Z',
  mimeType: 'application/pdf',
  rawText: 'Hemoglobin 13.2 g/dL 12.0 - 16.0\nGlucose 96 mg/dL 70 - 99',
  pageBreaks: [0],
  stage: 'READY',
  progress: 100,
  extractionModel: 'test',
}

const extraction: ExtractionOutput = {
  labs: [
    { testName: 'Hemoglobin', valueRaw: '13.2', unit: 'g/dL', rangeRaw: '12.0 - 16.0', confidence: 0.99 },
    { testName: 'Glucose', valueRaw: '96', unit: 'mg/dL', rangeRaw: '70 - 99', confidence: 0.98 },
  ],
  medications: [],
  warnings: [],
}

describe('provenance: no observation without a source', () => {
  it('structureLabs attaches sourceType + reportId to EVERY lab', () => {
    const labs = structureLabs(extraction, report)
    expect(labs.length).toBe(2)
    for (const l of labs) {
      expect(l.provenance.sourceType).toBe('DOCUMENT_EXTRACTED')
      expect(l.provenance.reportId).toBe('rep_x')
      expect(l.provenance.extractedAt).toBeTruthy()
    }
  })

  it('assertSourced THROWS if any observation lacks a source (enforced, not hoped)', () => {
    const sourceless = {
      testName: 'Ghost',
      provenance: { sourceType: undefined as unknown as LabResult['provenance']['sourceType'] },
    } as unknown as LabResult
    expect(() => assertSourced([sourceless])).toThrow(/no source/i)
  })

  it('manual entry is USER_PROVIDED but still fully sourced to its report', () => {
    const labs = structureManualLabs(
      [{ testName: 'Potassium', valueRaw: '4.1', unit: 'mmol/L', rangeRaw: '3.5 - 5.1' }],
      report,
    )
    expect(labs[0].provenance.sourceType).toBe('USER_PROVIDED')
    expect(labs[0].provenance.reportId).toBe('rep_x')
    expect(labs[0].verification).toBe('VERIFIED')
    expect(labs[0].status).toBe('WITHIN_RANGE')
  })

  it('manual entry never guesses a range: blank reference stays UNKNOWN', () => {
    const labs = structureManualLabs([{ testName: 'Ferritin', valueRaw: '22' }], report)
    expect(labs[0].referenceRange.unavailable).toBe(true)
    expect(labs[0].status).toBe('UNKNOWN')
  })
})
