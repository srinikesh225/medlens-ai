/**
 * Structuring stage: validated ExtractionOutput + the source Report → fully
 * formed, source-linked LabResult[] / Medication[]. This runs the range engine
 * and attaches REAL provenance spans (character offsets into the report text)
 * for every value we can locate. It is the bridge between "extracted text" and
 * "structured clinical record".
 */

import type { LabResult, Medication, Report, SourceSpan } from './types'
import type { ExtractionOutput } from '@/llm/schema'
import { evaluate, parseNumeric } from './referenceRange'
import { makeId, normalizeKey, pageForOffset } from './util'

function locate(report: Report, testName: string, valueRaw: string): SourceSpan | undefined {
  const anchor = report.rawText.indexOf(testName)
  const from = anchor >= 0 ? anchor : 0
  const valueIdx = report.rawText.indexOf(valueRaw, from)
  if (valueIdx < 0) return undefined
  return {
    reportId: report.id,
    page: pageForOffset(valueIdx, report.pageBreaks),
    start: valueIdx,
    end: valueIdx + valueRaw.length,
  }
}

export function structureLabs(extraction: ExtractionOutput, report: Report): LabResult[] {
  return extraction.labs.map((l) => {
    const { range, status } = evaluate(l.valueRaw, l.rangeRaw)
    return {
      id: makeId('lab'),
      reportId: report.id,
      testName: l.testName,
      normalizedKey: normalizeKey(l.testName),
      valueRaw: l.valueRaw,
      valueNum: parseNumeric(l.valueRaw),
      unit: l.unit,
      referenceRange: range,
      status,
      date: report.reportDate,
      specimen: l.specimen,
      observation: l.observation,
      provenance: {
        sourceType: 'DOCUMENT_EXTRACTED',
        reportId: report.id,
        reportTitle: report.title,
        span: locate(report, l.testName, l.valueRaw),
        confidence: l.confidence,
        extractedAt: report.uploadedAt,
      },
      verification: 'UNREVIEWED',
      notes: [],
    }
  })
}

export function structureMedications(extraction: ExtractionOutput, report: Report): Medication[] {
  return extraction.medications.map((m) => {
    const idx = report.rawText.indexOf(m.name)
    const span: SourceSpan | undefined =
      idx >= 0
        ? { reportId: report.id, page: pageForOffset(idx, report.pageBreaks), start: idx, end: idx + m.name.length }
        : undefined
    return {
      id: makeId('med'),
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      status: m.status,
      provenance: {
        sourceType: 'DOCUMENT_EXTRACTED',
        reportId: report.id,
        reportTitle: report.title,
        span,
        confidence: m.confidence,
        extractedAt: report.uploadedAt,
      },
      verification: 'UNREVIEWED',
    }
  })
}
