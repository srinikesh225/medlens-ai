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
import { buildDemoRecord } from '@/demo/seed'
import { deterministicExtractor, type Extractor } from '@/llm/extractor'
import { structureLabs, structureMedications } from '@/domain/structure'
import { makeId } from '@/domain/util'

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
  /** ms to dwell — deterministic so the demo cadence is repeatable. */
  dwell: number
}

/** The visible pipeline. Order mirrors the AI architecture in the README. */
export const PIPELINE: StageStep[] = [
  { stage: 'UPLOADING', label: 'Uploading document', progress: 12, dwell: 420 },
  { stage: 'OCR', label: 'Text / OCR extraction', progress: 26, dwell: 520 },
  { stage: 'SEGMENTING', label: 'Segmenting the document', progress: 40, dwell: 460 },
  { stage: 'EXTRACTING', label: 'Structured extraction', progress: 60, dwell: 640 },
  { stage: 'VALIDATING', label: 'Schema + deterministic validation', progress: 74, dwell: 520 },
  { stage: 'RANGE_CHECK', label: 'Reference-range check (from source)', progress: 84, dwell: 520 },
  { stage: 'PROVENANCE', label: 'Attaching provenance to each value', progress: 92, dwell: 440 },
  { stage: 'CONFLICT_SCAN', label: 'Scanning for conflicts', progress: 98, dwell: 480 },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
export function useUpload(extractor: Extractor = deterministicExtractor) {
  const { dispatch } = useStore()
  const running = useRef(false)

  async function run(
    input: UploadInput,
    onStage?: (step: StageStep) => void,
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

    try {
      dispatch({ type: 'ADD_REPORT', report })

      let extraction: Awaited<ReturnType<Extractor['extract']>> | null = null
      for (const step of PIPELINE) {
        dispatch({ type: 'SET_REPORT_STAGE', reportId, stage: step.stage, progress: step.progress })
        onStage?.(step)
        // Run the real extraction concurrently with the "Structured extraction" dwell.
        if (step.stage === 'EXTRACTING') {
          extraction = await extractor.extract(input.text)
        }
        await sleep(step.dwell)
      }

      if (!extraction) extraction = await extractor.extract(input.text)

      const labs = structureLabs(extraction, report)
      const medications = structureMedications(extraction, report)
      dispatch({
        type: 'COMMIT_EXTRACTION',
        reportId,
        labs,
        medications,
        warnings: extraction.warnings,
      })

      const rangeCount = labs.filter((l) => !l.referenceRange.unavailable).length
      return {
        reportId,
        labCount: labs.length,
        medCount: medications.length,
        rangeCount,
        noRangeCount: labs.length - rangeCount,
        warnings: extraction.warnings,
      }
    } catch (err) {
      dispatch({
        type: 'FAIL_REPORT',
        reportId,
        message: err instanceof Error ? err.message : 'Extraction failed',
      })
      throw err
    } finally {
      running.current = false
    }
  }

  return run
}
