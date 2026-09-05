/**
 * Deterministic demo dataset.
 *
 * WHY THIS EXISTS: a live demo must never depend on a network call to an LLM.
 * This module builds a realistic *fictional* patient and a set of reports whose
 * raw text is real, so:
 *   - reference ranges are read from the (fake but real) source text,
 *   - provenance spans are actual character offsets into that text
 *     (click-to-highlight is not faked), and
 *   - conflicts/trends emerge from the deterministic engines, not from hardcoding.
 *
 * All data is clearly synthetic. No real patient information is used.
 */

import type {
  Allergy,
  Condition,
  LabResult,
  Medication,
  PatientRecord,
  Report,
  SourceSpan,
  TimelineEvent,
  ClarificationQuestion,
  AuditEntry,
} from '@/domain/types'
import { evaluate } from '@/domain/referenceRange'
import { detectConflicts } from '@/domain/conflicts'
import { normalizeKey, pageForOffset } from '@/domain/util'

const REVIEW_DATE = '2026-09-05'
const MODEL = 'medlens-demo-extractor v1'

/** A raw lab row as it would appear in a report, before structuring. */
interface RawLab {
  testName: string
  valueRaw: string
  unit?: string
  rangeRaw: string // exactly as printed; '' or 'Not provided' means none
  specimen?: string
  observation?: string
  confidence: number
}

interface ReportSpec {
  id: string
  title: string
  kind: Report['kind']
  labName: string
  reportDate: string
  rawText: string
  rows: RawLab[]
}

/** Locate the value token for a row inside the report's raw text → real span. */
function spanFor(report: { id: string; rawText: string; pageBreaks: number[] }, row: RawLab): SourceSpan | undefined {
  const anchor = report.rawText.indexOf(row.testName)
  if (anchor < 0) return undefined
  const valueIdx = report.rawText.indexOf(row.valueRaw, anchor)
  if (valueIdx < 0) return undefined
  return {
    reportId: report.id,
    page: pageForOffset(valueIdx, report.pageBreaks),
    start: valueIdx,
    end: valueIdx + row.valueRaw.length,
  }
}

function buildReport(spec: ReportSpec): { report: Report; labs: LabResult[] } {
  const report: Report = {
    id: spec.id,
    title: spec.title,
    kind: spec.kind,
    labName: spec.labName,
    reportDate: spec.reportDate,
    uploadedAt: `${spec.reportDate}T09:15:00Z`,
    mimeType: 'application/pdf',
    rawText: spec.rawText,
    pageBreaks: [0],
    stage: 'READY',
    progress: 100,
    extractionModel: MODEL,
  }

  const labs: LabResult[] = spec.rows.map((row, i) => {
    const { range, status } = evaluate(row.valueRaw, row.rangeRaw)
    const valueNum = /^-?\d+(?:\.\d+)?$/.test(row.valueRaw.replace(/,/g, ''))
      ? Number(row.valueRaw.replace(/,/g, ''))
      : undefined
    const span = spanFor(report, row)
    return {
      id: `${spec.id}_lab_${i}`,
      reportId: spec.id,
      testName: row.testName,
      normalizedKey: normalizeKey(row.testName),
      valueRaw: row.valueRaw,
      valueNum,
      unit: row.unit,
      referenceRange: range,
      status,
      date: spec.reportDate,
      specimen: row.specimen,
      observation: row.observation,
      provenance: {
        sourceType: 'DOCUMENT_EXTRACTED',
        reportId: spec.id,
        reportTitle: spec.title,
        span,
        confidence: row.confidence,
        extractedAt: report.uploadedAt,
      },
      verification: 'UNREVIEWED',
      notes: [],
    }
  })

  return { report, labs }
}

/* ------------------------------------------------------------------ */
/* Report raw texts (fictional but realistically formatted).           */
/* ------------------------------------------------------------------ */

const R1_TEXT = `MERIDIAN DIAGNOSTICS  —  HEMATOLOGY REPORT
------------------------------------------------------------
Patient: Jordan M. Rivera            MRN: DEMO-2026-0475
Age/Sex: 47 / Male                   Collected: 15 Jul 2026
Specimen: Whole blood (EDTA)         Report No: MD-CBC-4471

COMPLETE BLOOD COUNT (CBC)
------------------------------------------------------------
Test                 Result     Unit       Reference
Hemoglobin           12.1       g/dL       12.0 - 16.0
WBC Count            11.8       10^3/uL    4.0 - 11.0
Platelet Count       210        10^3/uL    150 - 410
Hematocrit           37         %          36 - 46
Ferritin             22         ng/mL      Not provided
------------------------------------------------------------
Comment: Mild leukocytosis noted. Correlate clinically.
Verified by: Meridian Hematology Lab.`

const R2_TEXT = `MERIDIAN DIAGNOSTICS  —  HEMATOLOGY REPORT
------------------------------------------------------------
Patient: Jordan M. Rivera            MRN: DEMO-2026-0475
Collected: 19 Aug 2026               Report No: MD-CBC-5120

COMPLETE BLOOD COUNT (CBC) — repeat
------------------------------------------------------------
Test                 Result     Unit       Reference
Hemoglobin           12.8       g/dL       12.0 - 16.0
WBC Count            9.2        10^3/uL    4.0 - 11.0
Platelet Count       225        10^3/uL    150 - 410
------------------------------------------------------------
Comment: Repeat count within reported limits.`

const R3_TEXT = `MERIDIAN DIAGNOSTICS  —  METABOLIC + CBC PANEL
------------------------------------------------------------
Patient: Jordan M. Rivera            MRN: DEMO-2026-0475
Collected: 01 Sep 2026               Report No: MD-CMP-6033
Specimen: Serum, fasting

RESULTS
------------------------------------------------------------
Test                 Result     Unit       Reference
Hemoglobin           13.2       g/dL       12.0 - 16.0
Glucose (Fasting)    96         mg/dL      70 - 99
Creatinine           1.0        mg/dL      0.7 - 1.3
Sodium               139        mmol/L     135 - 145
Vitamin D (25-OH)    24         ng/mL      Not provided
------------------------------------------------------------
Comment: Fasting sample. Vitamin D range varies by method.`

const R4_TEXT = `NORTHSHORE LABS  —  CARDIAC & LIPID PANEL
------------------------------------------------------------
Patient: Jordan M Rivera             ID: DEMO-2026-0475
Collected: 01 Sep 2026               Accession: NS-LP-8890
Specimen: Serum

LIPID PROFILE
------------------------------------------------------------
Test                 Result     Unit       Reference
Total Cholesterol    214        mg/dL      < 200
LDL Cholesterol      138        mg/dL      < 130
HDL Cholesterol      41         mg/dL      > 40
Triglycerides        180        mg/dL      < 150

ADDITIONAL
------------------------------------------------------------
Hemoglobin           14.2       g/dL       12.0 - 16.0
Glucose (Random)     5.6        mmol/L     3.9 - 7.8
------------------------------------------------------------
Note: Analyzer calibrated 01 Sep 2026. SI units used for glucose.`

const R5_TEXT = `MERIDIAN FAMILY CLINIC  —  MEDICATION & PRESCRIPTION RECORD
------------------------------------------------------------
Patient: Jordan M. Rivera            MRN: DEMO-2026-0475
Reviewed: 19 Aug 2026                Clinician: Dr. A. Rao

CURRENT MEDICATIONS
------------------------------------------------------------
- Metformin 500 mg — twice daily (active)
- Atorvastatin 10 mg — once at night (active)
- Lisinopril 5 mg — status not confirmed at this visit
- Penicillin V 250 mg — listed from prior record

ALLERGIES (patient-reported): Penicillin (rash)
------------------------------------------------------------
Note: Reconcile medication list at next visit.`

/* ------------------------------------------------------------------ */
/* Assemble the record.                                                */
/* ------------------------------------------------------------------ */

export function buildDemoRecord(): PatientRecord {
  const built = [
    buildReport({
      id: 'rep_cbc_jul', title: 'CBC — 15 Jul 2026', kind: 'LAB', labName: 'Meridian Diagnostics',
      reportDate: '2026-07-15', rawText: R1_TEXT,
      rows: [
        { testName: 'Hemoglobin', valueRaw: '12.1', unit: 'g/dL', rangeRaw: '12.0 - 16.0', specimen: 'Whole blood (EDTA)', confidence: 0.99 },
        { testName: 'WBC Count', valueRaw: '11.8', unit: '10^3/uL', rangeRaw: '4.0 - 11.0', observation: 'Mild leukocytosis noted.', confidence: 0.97 },
        { testName: 'Platelet Count', valueRaw: '210', unit: '10^3/uL', rangeRaw: '150 - 410', confidence: 0.98 },
        { testName: 'Hematocrit', valueRaw: '37', unit: '%', rangeRaw: '36 - 46', confidence: 0.96 },
        { testName: 'Ferritin', valueRaw: '22', unit: 'ng/mL', rangeRaw: 'Not provided', confidence: 0.92 },
      ],
    }),
    buildReport({
      id: 'rep_cbc_aug', title: 'CBC repeat — 19 Aug 2026', kind: 'LAB', labName: 'Meridian Diagnostics',
      reportDate: '2026-08-19', rawText: R2_TEXT,
      rows: [
        { testName: 'Hemoglobin', valueRaw: '12.8', unit: 'g/dL', rangeRaw: '12.0 - 16.0', confidence: 0.99 },
        { testName: 'WBC Count', valueRaw: '9.2', unit: '10^3/uL', rangeRaw: '4.0 - 11.0', confidence: 0.98 },
        { testName: 'Platelet Count', valueRaw: '225', unit: '10^3/uL', rangeRaw: '150 - 410', confidence: 0.98 },
      ],
    }),
    buildReport({
      id: 'rep_cmp_sep', title: 'Metabolic + CBC — 01 Sep 2026', kind: 'LAB', labName: 'Meridian Diagnostics',
      reportDate: '2026-09-01', rawText: R3_TEXT,
      rows: [
        { testName: 'Hemoglobin', valueRaw: '13.2', unit: 'g/dL', rangeRaw: '12.0 - 16.0', confidence: 0.99 },
        { testName: 'Glucose (Fasting)', valueRaw: '96', unit: 'mg/dL', rangeRaw: '70 - 99', specimen: 'Serum, fasting', confidence: 0.98 },
        { testName: 'Creatinine', valueRaw: '1.0', unit: 'mg/dL', rangeRaw: '0.7 - 1.3', confidence: 0.97 },
        { testName: 'Sodium', valueRaw: '139', unit: 'mmol/L', rangeRaw: '135 - 145', confidence: 0.98 },
        { testName: 'Vitamin D (25-OH)', valueRaw: '24', unit: 'ng/mL', rangeRaw: 'Not provided', observation: 'Range varies by method.', confidence: 0.9 },
      ],
    }),
    buildReport({
      id: 'rep_lipid_sep', title: 'Cardiac & Lipid Panel — 01 Sep 2026', kind: 'LAB', labName: 'Northshore Labs',
      reportDate: '2026-09-01', rawText: R4_TEXT,
      rows: [
        { testName: 'Total Cholesterol', valueRaw: '214', unit: 'mg/dL', rangeRaw: '< 200', confidence: 0.98 },
        { testName: 'LDL Cholesterol', valueRaw: '138', unit: 'mg/dL', rangeRaw: '< 130', confidence: 0.97 },
        { testName: 'HDL Cholesterol', valueRaw: '41', unit: 'mg/dL', rangeRaw: '> 40', confidence: 0.97 },
        { testName: 'Triglycerides', valueRaw: '180', unit: 'mg/dL', rangeRaw: '< 150', confidence: 0.97 },
        { testName: 'Hemoglobin', valueRaw: '14.2', unit: 'g/dL', rangeRaw: '12.0 - 16.0', confidence: 0.95 },
        { testName: 'Glucose (Random)', valueRaw: '5.6', unit: 'mmol/L', rangeRaw: '3.9 - 7.8', confidence: 0.94 },
      ],
    }),
  ]

  const medRecord: Report = {
    id: 'rep_med_aug', title: 'Medication & Prescription Record — 19 Aug 2026', kind: 'MEDICATION_RECORD',
    labName: 'Meridian Family Clinic', reportDate: '2026-08-19', uploadedAt: '2026-08-19T10:00:00Z',
    mimeType: 'application/pdf', rawText: R5_TEXT, pageBreaks: [0], stage: 'READY', progress: 100, extractionModel: MODEL,
  }

  const reports = [...built.map((b) => b.report), medRecord]
  const labs = built.flatMap((b) => b.labs)

  const medProv = (name: string) => {
    const idx = R5_TEXT.indexOf(name)
    const span: SourceSpan | undefined = idx >= 0
      ? { reportId: 'rep_med_aug', page: 1, start: idx, end: idx + name.length }
      : undefined
    return { sourceType: 'DOCUMENT_EXTRACTED' as const, reportId: 'rep_med_aug', reportTitle: medRecord.title, span, confidence: 0.95, extractedAt: medRecord.uploadedAt }
  }

  const medications: Medication[] = [
    { id: 'med_metformin', name: 'Metformin', dose: '500 mg', frequency: 'Twice daily', status: 'ACTIVE', provenance: medProv('Metformin'), verification: 'UNREVIEWED' },
    { id: 'med_atorvastatin', name: 'Atorvastatin', dose: '10 mg', frequency: 'Once at night', status: 'ACTIVE', provenance: medProv('Atorvastatin'), verification: 'UNREVIEWED' },
    { id: 'med_lisinopril', name: 'Lisinopril', dose: '5 mg', status: 'UNKNOWN', provenance: medProv('Lisinopril'), verification: 'UNREVIEWED' },
    { id: 'med_penicillin', name: 'Penicillin V', dose: '250 mg', status: 'UNKNOWN', provenance: medProv('Penicillin V'), verification: 'UNREVIEWED' },
  ]

  const conditions: Condition[] = [
    { id: 'cond_dm', name: 'Type 2 diabetes (recorded)', provenance: { sourceType: 'USER_PROVIDED', confidence: 1 }, verification: 'VERIFIED' },
    { id: 'cond_htn', name: 'Hypertension (recorded)', provenance: { sourceType: 'USER_PROVIDED', confidence: 1 }, verification: 'VERIFIED' },
  ]

  const allergies: Allergy[] = [
    { id: 'alg_pen', substance: 'Penicillin', reaction: 'Rash', provenance: { sourceType: 'USER_PROVIDED', confidence: 1 }, verification: 'VERIFIED' },
  ]

  const demographics = {
    patientId: 'DEMO-2026-0475',
    name: 'Jordan M. Rivera',
    age: 47,
    sex: 'Male',
    dateOfBirth: '1979-03-12',
    symptoms: ['Fatigue', 'Occasional dizziness'],
    history: ['Type 2 diabetes', 'Hypertension'],
    provenance: {
      name: { sourceType: 'USER_PROVIDED' as const, confidence: 1 },
      patientId: { sourceType: 'USER_PROVIDED' as const, confidence: 1 },
      age: { sourceType: 'USER_PROVIDED' as const, confidence: 1 },
      sex: { sourceType: 'USER_PROVIDED' as const, confidence: 1 },
      dateOfBirth: { sourceType: 'USER_PROVIDED' as const, confidence: 1 },
      symptoms: { sourceType: 'USER_PROVIDED' as const, confidence: 1 },
    },
  }

  const clarifications: ClarificationQuestion[] = [
    {
      id: 'clar_hgb', category: 'CONFLICT',
      question: 'Two reports dated 01 Sep 2026 give different Hemoglobin values (13.2 vs 14.2 g/dL). Which source should be considered authoritative?',
      rationale: 'Same test, same date, materially different values from two different laboratories.',
      relatedReportId: 'rep_lipid_sep', answered: false,
    },
    {
      id: 'clar_lisinopril', category: 'STATUS',
      question: 'The medication record lists Lisinopril but marks its status as not confirmed. Can its current status be confirmed?',
      rationale: 'A medication was listed without an explicit active/discontinued status.',
      relatedReportId: 'rep_med_aug', answered: false,
    },
    {
      id: 'clar_noranges', category: 'MISSING',
      question: 'Ferritin and Vitamin D results have no reference range printed in their source reports. Can the reporting laboratory’s ranges be provided?',
      rationale: 'MedLens will not substitute a generic reference range; these values remain un-range-checked until a source range is supplied.',
      answered: false,
    },
  ]

  const audit: AuditEntry[] = reports.map((r) => ({
    id: `aud_up_${r.id}`,
    at: r.uploadedAt,
    actor: 'System',
    action: 'REPORT_UPLOADED' as const,
    detail: `Uploaded and extracted: ${r.title}`,
  }))

  const record: PatientRecord = {
    demographics,
    reports,
    labs,
    medications,
    conditions,
    allergies,
    conflicts: [],
    clarifications,
    audit,
  }

  record.conflicts = detectConflicts(record, `${REVIEW_DATE}T00:00:00Z`)
  return record
}

export function buildTimeline(record: PatientRecord): TimelineEvent[] {
  const events: TimelineEvent[] = record.reports.map((r) => ({
    id: `tl_${r.id}`,
    date: r.reportDate,
    kind: r.kind,
    title: r.title,
    reportId: r.id,
    summary:
      r.kind === 'MEDICATION_RECORD'
        ? `${record.medications.length} medications listed`
        : `${record.labs.filter((l) => l.reportId === r.id).length} values extracted`,
  }))
  events.push({
    id: 'tl_review',
    date: REVIEW_DATE,
    kind: 'REVIEW',
    title: 'Current review',
    summary: `${record.labs.filter((l) => l.verification === 'VERIFIED').length} verified · ${record.conflicts.filter((c) => c.status === 'OPEN').length} open conflicts`,
  })
  return events.sort((a, b) => a.date.localeCompare(b.date))
}

export const DEMO_REVIEW_DATE = REVIEW_DATE
