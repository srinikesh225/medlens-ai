/**
 * MedLens domain model.
 *
 * Design principle: every clinically meaningful fact carries its PROVENANCE.
 * We never store a value without knowing where it came from, how confident the
 * extraction was, and whether a human has reviewed it. This is what separates
 * MedLens from "ChatGPT + a PDF" — the structured, source-linked record is the
 * product; the AI is only the extraction layer.
 */

/** Where a piece of information originated. Drives the provenance badges. */
export type SourceType =
  | 'USER_PROVIDED' // a human typed it into MedLens
  | 'DOCUMENT_EXTRACTED' // pulled verbatim from an uploaded report
  | 'AI_GENERATED' // synthesized by the model (e.g. a summary line)
  | 'HUMAN_VERIFIED' // a reviewer has confirmed it
  | 'CONFLICT' // two sources disagree — needs human resolution

/** Human-review lifecycle for an extracted fact. */
export type VerificationState =
  | 'UNREVIEWED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EDITED' // a human changed the value; original preserved in audit trail

/** Result of comparing a numeric value to the range PRINTED IN THE SOURCE. */
export type RangeStatus =
  | 'LOW'
  | 'WITHIN_RANGE'
  | 'HIGH'
  | 'UNKNOWN' // numeric value, but the source provided no usable range — never guessed
  | 'UNEVALUABLE' // the value itself is non-numeric / inequality / malformed — can't be checked

/**
 * A character span into a report's raw text. This is REAL provenance:
 * click a value → we highlight exactly these characters in the original.
 */
export interface SourceSpan {
  reportId: string
  page: number
  start: number // inclusive char offset into report.rawText
  end: number // exclusive
}

/** Provenance attached to every extracted fact. */
export interface Provenance {
  sourceType: SourceType
  reportId?: string
  reportTitle?: string
  span?: SourceSpan
  /** 0..1 extraction reliability. NOT medical certainty. */
  confidence?: number
  extractedAt?: string // ISO
}

/** A parsed reference range from the source document. */
export interface ReferenceRange {
  /** Verbatim text as printed in the report, e.g. "12.0 - 16.0" or "< 200". */
  raw: string
  low?: number
  high?: number
  /** True when the source provided no usable range. We display this honestly. */
  unavailable: boolean
  unit?: string
}

export interface AuditEntry {
  id: string
  at: string // ISO
  actor: string // reviewer name (demo: "Dr. A. Rao")
  action:
    | 'EXTRACTED'
    | 'VERIFIED'
    | 'REJECTED'
    | 'EDITED'
    | 'CONFLICT_RESOLVED'
    | 'NOTE_ADDED'
    | 'REPORT_UPLOADED'
    | 'CLARIFICATION_ANSWERED'
    | 'MANUAL_ENTRY'
  detail: string
  /** For EDITED actions we retain the prior value. */
  from?: string
  to?: string
}

/** A single laboratory measurement. The core extracted unit of MedLens. */
export interface LabResult {
  id: string
  reportId: string
  /** Test name preserved as printed, plus a normalized key for grouping. */
  testName: string
  normalizedKey: string // lowercased canonical name for trend/conflict grouping
  valueRaw: string // exactly as printed ("13.2", "Positive", "5.4")
  valueNum?: number // parsed numeric value when applicable
  unit?: string
  referenceRange: ReferenceRange
  status: RangeStatus // computed by the deterministic range engine
  date: string // ISO date of the specimen/report
  specimen?: string
  observation?: string // free-text remark printed in the report
  provenance: Provenance
  verification: VerificationState
  notes: string[]
}

export interface Medication {
  id: string
  name: string
  dose?: string
  frequency?: string
  status: 'ACTIVE' | 'UNKNOWN' | 'DISCONTINUED'
  provenance: Provenance
  verification: VerificationState
}

export interface Condition {
  id: string
  name: string
  provenance: Provenance
  verification: VerificationState
}

export interface Allergy {
  id: string
  substance: string
  reaction?: string
  provenance: Provenance
  verification: VerificationState
}

export interface PatientDemographics {
  patientId: string
  name: string
  age?: number
  sex?: string
  dateOfBirth?: string
  symptoms: string[]
  history: string[]
  /** Each demographic field can carry its own provenance badge. */
  provenance: Record<string, Provenance>
}

/** Processing stages surfaced in the UI — the pipeline is never a black box. */
export type ProcessingStage =
  | 'QUEUED'
  | 'UPLOADING'
  | 'OCR' // text / OCR extraction
  | 'SEGMENTING'
  | 'EXTRACTING' // structured LLM extraction
  | 'VALIDATING' // schema + deterministic validation
  | 'RANGE_CHECK'
  | 'PROVENANCE'
  | 'CONFLICT_SCAN'
  | 'READY'
  | 'FAILED'

export interface Report {
  id: string
  title: string
  kind: 'LAB' | 'PRESCRIPTION' | 'MEDICATION_RECORD' | 'CLINICAL_NOTE' | 'IMAGING'
  labName?: string
  reportDate: string // ISO
  uploadedAt: string // ISO
  mimeType: string
  /** The original text of the document. Source of every span/highlight. */
  rawText: string
  pageBreaks: number[] // char offsets where a new page begins (page 1 starts at 0)
  stage: ProcessingStage
  /** 0..100 for the progress bar. */
  progress: number
  extractionModel: string // e.g. "medlens-demo-extractor" or a real model id
}

export type ConflictKind =
  | 'VALUE_MISMATCH' // same test, materially different values
  | 'UNIT_MISMATCH'
  | 'DEMOGRAPHIC_MISMATCH'
  | 'DUPLICATE_REPORT'
  | 'IMPOSSIBLE_CHRONOLOGY'
  | 'MEDICATION_STATUS'
  | 'ALLERGY_INCONSISTENCY'

export interface Conflict {
  id: string
  kind: ConflictKind
  concept: string // e.g. "Hemoglobin", "Date of birth"
  summary: string
  /** IDs + human-readable evidence for each side of the disagreement. */
  evidence: {
    label: string
    value: string
    reportId?: string
    reportTitle?: string
    date?: string
    span?: SourceSpan
  }[]
  status: 'OPEN' | 'RESOLVED' | 'ACKNOWLEDGED'
  resolutionNote?: string
  /** Never auto-decided; a human picks, if they choose to. */
  resolvedInFavorOf?: string
}

export interface TimelineEvent {
  id: string
  date: string // ISO
  kind: Report['kind'] | 'REVIEW'
  title: string
  reportId?: string
  summary: string
}

export interface ClarificationQuestion {
  id: string
  question: string
  rationale: string
  relatedReportId?: string
  category: 'AMBIGUITY' | 'MISSING' | 'CONFLICT' | 'STATUS'
  answered: boolean
  answer?: string
}

/** A single trend series for one test across time. */
export interface TrendSeries {
  normalizedKey: string
  testName: string
  unit?: string
  points: { date: string; value: number; status: RangeStatus; resultId: string }[]
  /** DATA description only — never a clinical interpretation. */
  direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'MIXED' | 'INSUFFICIENT'
  dataNote: string
}

/** The complete patient record — MedLens' unit of work. */
export interface PatientRecord {
  demographics: PatientDemographics
  reports: Report[]
  labs: LabResult[]
  medications: Medication[]
  conditions: Condition[]
  allergies: Allergy[]
  conflicts: Conflict[]
  clarifications: ClarificationQuestion[]
  audit: AuditEntry[]
}
