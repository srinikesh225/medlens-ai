import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import type { PatientRecord, ProcessingStage, Report } from '@/domain/types'
import { reducer } from './reducer'
import type { Action } from './actions'
import { buildDemoRecord, DEMO_REVIEW_DATE } from '@/demo/seed'
import { deterministicExtractor, type Extractor } from '@/llm/extractor'
import { makeLiveExtractor } from '@/llm/anthropic'
import { validateExtraction } from '@/llm/schema'
import { structureLabs, structureMedications } from '@/domain/structure'
import { detectConflicts } from '@/domain/conflicts'
import { makeId } from '@/domain/util'
import { LIVE_EXTRACTION, EXTRACTION_ENDPOINT, EXTRACTION_MODEL } from '@/config'

const STORAGE_KEY = 'medlens.record.v1'
export const REVIEWER = 'Dr. A. Rao'

function load(): PatientRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PatientRecord
  } catch {
    /* ignore — fall through to demo */
  }
  return buildDemoRecord()
}

interface StoreValue {
  record: PatientRecord
  dispatch: React.Dispatch<Action>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [record, dispatch] = useReducer(reducer, undefined, load)

  // Persist (best-effort; localStorage may be unavailable in private mode).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    } catch {
      /* ignore */
    }
  }, [record])

  const value = useMemo(() => ({ record, dispatch }), [record])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Upload pipeline runner — the staged, visible processing experience.  */
/* ------------------------------------------------------------------ */

export interface UploadInput {
  title: string
  labName: string
  reportDate: string
  kind: Report['kind']
  text: string
  filename: string
  mimeType?: string
}

export interface StageStep {
  stage: ProcessingStage
  label: string
  progress: number
}

/**
 * The visible pipeline. Each stage performs REAL work in the runner below and
 * reports a genuine result metric; these entries only supply the display label
 * and the target progress value.
 */
export const PIPELINE: StageStep[] = [
  { stage: 'UPLOADING', label: 'Reading document', progress: 12 },
  { stage: 'OCR', label: 'Text extraction', progress: 26 },
  { stage: 'SEGMENTING', label: 'Segmenting the document', progress: 40 },
  { stage: 'EXTRACTING', label: 'Structured extraction', progress: 60 },
  { stage: 'VALIDATING', label: 'Schema + deterministic validation', progress: 74 },
  { stage: 'RANGE_CHECK', label: 'Reference-range check (from source)', progress: 84 },
  { stage: 'PROVENANCE', label: 'Attaching provenance to each value', progress: 92 },
  { stage: 'CONFLICT_SCAN', label: 'Scanning for conflicts', progress: 98 },
]

/** A completed stage plus the REAL metric its work produced. */
export interface StageEvent extends StageStep {
  detail: string
}

/**
 * A small presentation delay so each real stage is legible in the UI. This is
 * pacing only — NOT simulated work: the metric reported for every stage is
 * computed from the actual document/extraction at that step.
 */
const STAGE_MIN_MS = 240
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Real, deterministic segmentation: separator-delimited blocks in the report. */
function segmentDocument(text: string): number {
  const blocks = text
    .split(/\n\s*[-=_]{3,}\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  return Math.max(1, blocks.length)
}

export interface UploadResult {
  reportId: string
  labCount: number
  medCount: number
  rangeCount: number
  noRangeCount: number
  warnings: string[]
}

/**
 * Hook returning a runner that performs the visible pipeline and commits the
 * structured, source-linked result. Uses the deterministic extractor by default;
 * a live extractor can be injected (production path).
 */
/**
 * The active extractor. Under DEMO_MODE (default) this is always the offline
 * deterministic extractor — no network. Only when the live path is explicitly
 * enabled AND a backend endpoint is configured do we use the live adapter.
 */
export function defaultExtractor(): Extractor {
  return LIVE_EXTRACTION
    ? makeLiveExtractor({ endpoint: EXTRACTION_ENDPOINT, model: EXTRACTION_MODEL })
    : deterministicExtractor
}

export function useUpload(extractor: Extractor = defaultExtractor()) {
  const { record, dispatch } = useStore()
  const running = useRef(false)

  async function run(
    input: UploadInput,
    onStage?: (event: StageEvent) => void,
  ): Promise<UploadResult> {
    if (running.current) throw new Error('An upload is already in progress.')
    running.current = true
    const reportId = makeId('rep')
    const report: Report = {
      id: reportId,
      title: input.title,
      kind: input.kind,
      labName: input.labName,
      reportDate: input.reportDate,
      uploadedAt: new Date().toISOString(),
      mimeType: input.mimeType ?? 'application/pdf',
      rawText: input.text,
      pageBreaks: [0],
      stage: 'QUEUED',
      progress: 0,
      extractionModel: extractor.id,
    }

    // Advance to stage `i` AFTER its real work produced `detail`.
    const emit = async (i: number, detail: string) => {
      const s = PIPELINE[i]
      dispatch({ type: 'SET_REPORT_STAGE', reportId, stage: s.stage, progress: s.progress })
      onStage?.({ ...s, detail })
      await sleep(STAGE_MIN_MS)
    }

    try {
      dispatch({ type: 'ADD_REPORT', report })

      // 0 — Reading document (real: measure it)
      const lines = input.text.split(/\r?\n/)
      await emit(0, `${input.text.length.toLocaleString()} characters · ${lines.length} lines`)

      // 1 — Text extraction (real: non-empty lines)
      const textLines = lines.filter((l) => l.trim().length > 0)
      await emit(1, `${textLines.length} non-empty lines`)

      // 2 — Segmenting (real: separator-delimited blocks)
      await emit(2, `${segmentDocument(input.text)} section(s) detected`)

      // 3 — Structured extraction (real: run the extractor)
      const extraction = await extractor.extract(input.text)
      await emit(3, `${extraction.labs.length} value(s) · ${extraction.medications.length} medication(s)`)

      // 4 — Schema + deterministic validation (real, explicit gate)
      const validated = validateExtraction(extraction)
      if (!validated.ok || !validated.value) {
        throw new Error('Schema validation rejected the extraction: ' + validated.errors.join('; '))
      }
      const valid = validated.value
      await emit(4, `schema valid · ${valid.warnings.length} warning(s)`)

      // 5 — Reference-range check (real: run the range engine via structuring)
      const labs = structureLabs(valid, report)
      const medications = structureMedications(valid, report)
      const evaluated = labs.filter((l) => !l.referenceRange.unavailable).length
      await emit(5, `${evaluated}/${labs.length} value(s) checked against a source range`)

      // 6 — Provenance (real: count values linked to a source span)
      const linked = labs.filter((l) => l.provenance.span).length
      await emit(6, `${linked}/${labs.length} value(s) linked to a source span`)

      // 7 — Conflict scan (real: run the detector on the prospective record)
      const preview = detectConflicts(
        {
          labs: [...record.labs, ...labs],
          medications: [...record.medications, ...medications],
          allergies: record.allergies,
          reports: [...record.reports, report],
          conflicts: record.conflicts,
        },
        `${DEMO_REVIEW_DATE}T00:00:00Z`,
      )
      const openConflicts = preview.filter((c) => c.status === 'OPEN').length
      await emit(7, `${openConflicts} open conflict(s) across the record`)

      // Commit (the reducer re-runs range/conflict logic authoritatively)
      dispatch({ type: 'COMMIT_EXTRACTION', reportId, labs, medications, warnings: valid.warnings })

      return {
        reportId,
        labCount: labs.length,
        medCount: medications.length,
        rangeCount: evaluated,
        noRangeCount: labs.length - evaluated,
        warnings: valid.warnings,
      }
    } catch (err) {
      dispatch({
        type: 'FAIL_REPORT',
        reportId,
        message: err instanceof Error ? err.message : 'Extraction failed',
      })
      // Preserve the reportId on the error so the UI can offer manual entry
      // against the document that was kept.
      const wrapped = err instanceof Error ? err : new Error('Extraction failed')
      ;(wrapped as Error & { reportId?: string }).reportId = reportId
      throw wrapped
    } finally {
      running.current = false
    }
  }

  return run
}
