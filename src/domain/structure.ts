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

/**
 * ENFORCED INVARIANT: no observation may enter the record without a source.
 * Every LabResult must carry a sourceType AND a reportId. This is a hard guard
 * at the creation boundary — a bug that produced a sourceless observation throws
 * here instead of silently persisting unattributed clinical data.
 */
export function assertSourced(labs: LabResult[]): LabResult[] {
  for (const l of labs) {
    if (!l.provenance || !l.provenance.sourceType || !l.provenance.reportId) {
      throw new Error(
        `Provenance invariant violated: "${l.testName}" has no source (sourceType/reportId required).`,
      )
    }
  }
  return labs
}

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
  return assertSourced(
    extraction.labs.map((l) => {
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
    }),
  )
}

/** A row a human types on the manual-entry fallback. */
export interface ManualLabInput {
  testName: string
  valueRaw: string
  unit?: string
  rangeRaw?: string
}

/**
 * Structure human-entered values into LabResults. These are USER_PROVIDED (not
 * document-extracted) and marked verified because a person asserted them. The
 * range engine still computes status only from the reference range the human
 * typed — never a guessed one. If the typed value happens to appear in the
 * source text we link a span; otherwise there is none (View Source stays hidden).
 */
export function structureManualLabs(rows: ManualLabInput[], report: Report): LabResult[] {
  return assertSourced(
    rows
    .filter((r) => r.testName.trim() && r.valueRaw.trim())
    .map((r) => {
      const { range, status } = evaluate(r.valueRaw.trim(), r.rangeRaw)
      const span = locate(report, r.testName.trim(), r.valueRaw.trim())
      return {
        id: makeId('lab'),
        reportId: report.id,
        testName: r.testName.trim(),
        normalizedKey: normalizeKey(r.testName),
        valueRaw: r.valueRaw.trim(),
        valueNum: parseNumeric(r.valueRaw),
        unit: r.unit?.trim() || undefined,
        referenceRange: range,
        status,
        date: report.reportDate,
        provenance: {
          sourceType: 'USER_PROVIDED',
          reportId: report.id,
          reportTitle: report.title,
          span,
          confidence: 1,
          extractedAt: new Date().toISOString(),
        },
        verification: 'VERIFIED',
        notes: ['Entered manually after automatic extraction was unavailable.'],
      }
    }),
  )
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
