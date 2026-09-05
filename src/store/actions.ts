import type {
  LabResult,
  Medication,
  PatientRecord,
  ProcessingStage,
  Report,
} from '@/domain/types'

export type Action =
  | { type: 'LOAD_DEMO' }
  | { type: 'RESET_ALL' }
  | { type: 'HYDRATE'; record: PatientRecord }
  | { type: 'ADD_REPORT'; report: Report }
  | { type: 'SET_REPORT_STAGE'; reportId: string; stage: ProcessingStage; progress: number }
  | { type: 'FAIL_REPORT'; reportId: string; message: string }
  | {
      type: 'COMMIT_EXTRACTION'
      reportId: string
      labs: LabResult[]
      medications: Medication[]
      warnings: string[]
    }
  | { type: 'VERIFY_LAB'; labId: string; actor: string }
  | { type: 'REJECT_LAB'; labId: string; actor: string }
  | {
      type: 'EDIT_LAB'
      labId: string
      patch: { valueRaw?: string; rangeRaw?: string; unit?: string }
      actor: string
    }
  | { type: 'ADD_LAB_NOTE'; labId: string; note: string; actor: string }
  | { type: 'VERIFY_ALL_IN_REPORT'; reportId: string; actor: string }
  | { type: 'SET_MED_STATUS'; medId: string; status: Medication['status']; actor: string }
  | {
      type: 'RESOLVE_CONFLICT'
      conflictId: string
      resolvedInFavorOf?: string
      note: string
      actor: string
    }
  | { type: 'ACK_CONFLICT'; conflictId: string; actor: string }
  | { type: 'ANSWER_CLARIFICATION'; id: string; answer: string; actor: string }
