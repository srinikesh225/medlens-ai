import type { AuditEntry, LabResult, PatientRecord } from '@/domain/types'
import { detectConflicts } from '@/domain/conflicts'
import { evaluate } from '@/domain/referenceRange'
import { makeId } from '@/domain/util'
import { buildDemoRecord, DEMO_REVIEW_DATE } from '@/demo/seed'
import type { Action } from './actions'

const NOW_ISO = () => new Date().toISOString()

function audit(record: PatientRecord, entry: Omit<AuditEntry, 'id' | 'at'> & { at?: string }): PatientRecord {
  return {
    ...record,
    audit: [{ id: makeId('aud'), at: entry.at ?? NOW_ISO(), ...entry }, ...record.audit],
  }
}

/** Recompute conflicts after any change that could affect them. */
function recompute(record: PatientRecord): PatientRecord {
  return {
    ...record,
    conflicts: detectConflicts(record, `${DEMO_REVIEW_DATE}T00:00:00Z`),
  }
}

function mapLab(record: PatientRecord, labId: string, fn: (l: LabResult) => LabResult): PatientRecord {
  return { ...record, labs: record.labs.map((l) => (l.id === labId ? fn(l) : l)) }
}

export function reducer(record: PatientRecord, action: Action): PatientRecord {
  switch (action.type) {
    case 'LOAD_DEMO':
    case 'RESET_ALL':
      return buildDemoRecord()

    case 'HYDRATE':
      return action.record

    case 'ADD_REPORT':
      return { ...record, reports: [...record.reports, action.report] }

    case 'SET_REPORT_STAGE':
      return {
        ...record,
        reports: record.reports.map((r) =>
          r.id === action.reportId ? { ...r, stage: action.stage, progress: action.progress } : r,
        ),
      }

    case 'FAIL_REPORT':
      return {
        ...record,
        reports: record.reports.map((r) =>
          r.id === action.reportId ? { ...r, stage: 'FAILED', progress: 100 } : r,
        ),
      }

    case 'COMMIT_EXTRACTION': {
      let next: PatientRecord = {
        ...record,
        reports: record.reports.map((r) =>
          r.id === action.reportId ? { ...r, stage: 'READY', progress: 100 } : r,
        ),
        labs: [...record.labs, ...action.labs],
        medications: [...record.medications, ...action.medications],
      }
      const report = next.reports.find((r) => r.id === action.reportId)
      next = audit(next, {
        actor: 'System',
        action: 'EXTRACTED',
        detail: `Extracted ${action.labs.length} value(s) and ${action.medications.length} medication(s) from ${report?.title ?? 'report'}${
          action.warnings.length ? ` · ${action.warnings.length} warning(s)` : ''
        }`,
      })
      return recompute(next)
    }

    case 'VERIFY_LAB': {
      const lab = record.labs.find((l) => l.id === action.labId)
      let next = mapLab(record, action.labId, (l) => ({ ...l, verification: 'VERIFIED' }))
      next = audit(next, {
        actor: action.actor,
        action: 'VERIFIED',
        detail: `Verified ${lab?.testName ?? 'value'} = ${lab?.valueRaw ?? ''}${lab?.unit ? ' ' + lab.unit : ''}`,
      })
      return next
    }

    case 'REJECT_LAB': {
      const lab = record.labs.find((l) => l.id === action.labId)
      let next = mapLab(record, action.labId, (l) => ({ ...l, verification: 'REJECTED' }))
      next = audit(next, {
        actor: action.actor,
        action: 'REJECTED',
        detail: `Rejected ${lab?.testName ?? 'value'} = ${lab?.valueRaw ?? ''}`,
      })
      return recompute(next)
    }

    case 'EDIT_LAB': {
      const lab = record.labs.find((l) => l.id === action.labId)
      if (!lab) return record
      const valueRaw = action.patch.valueRaw ?? lab.valueRaw
      const rangeRaw = action.patch.rangeRaw ?? lab.referenceRange.raw
      const unit = action.patch.unit ?? lab.unit
      const { range, status } = evaluate(valueRaw, rangeRaw)
      const valueNum = /^-?\d+(?:\.\d+)?$/.test(valueRaw.replace(/,/g, ''))
        ? Number(valueRaw.replace(/,/g, ''))
        : undefined
      let next = mapLab(record, action.labId, (l) => ({
        ...l,
        valueRaw,
        valueNum,
        unit,
        referenceRange: range,
        status,
        verification: 'EDITED',
      }))
      next = audit(next, {
        actor: action.actor,
        action: 'EDITED',
        detail: `Edited ${lab.testName}`,
        from: `${lab.valueRaw}${lab.unit ? ' ' + lab.unit : ''}${lab.referenceRange.raw ? ` (${lab.referenceRange.raw})` : ''}`,
        to: `${valueRaw}${unit ? ' ' + unit : ''}${rangeRaw ? ` (${rangeRaw})` : ''}`,
      })
      return recompute(next)
    }

    case 'ADD_LAB_NOTE': {
      const lab = record.labs.find((l) => l.id === action.labId)
      let next = mapLab(record, action.labId, (l) => ({ ...l, notes: [...l.notes, action.note] }))
      next = audit(next, {
        actor: action.actor,
        action: 'NOTE_ADDED',
        detail: `Note on ${lab?.testName ?? 'value'}: “${action.note}”`,
      })
      return next
    }

    case 'VERIFY_ALL_IN_REPORT': {
      const affected = record.labs.filter(
        (l) => l.reportId === action.reportId && l.verification === 'UNREVIEWED',
      )
      let next: PatientRecord = {
        ...record,
        labs: record.labs.map((l) =>
          l.reportId === action.reportId && l.verification === 'UNREVIEWED'
            ? { ...l, verification: 'VERIFIED' }
            : l,
        ),
      }
      next = audit(next, {
        actor: action.actor,
        action: 'VERIFIED',
        detail: `Verified ${affected.length} value(s) in a report`,
      })
      return next
    }

    case 'SET_MED_STATUS': {
      const med = record.medications.find((m) => m.id === action.medId)
      let next: PatientRecord = {
        ...record,
        medications: record.medications.map((m) =>
          m.id === action.medId ? { ...m, status: action.status, verification: 'VERIFIED' } : m,
        ),
      }
      next = audit(next, {
        actor: action.actor,
        action: 'VERIFIED',
        detail: `Set ${med?.name ?? 'medication'} status to ${action.status.toLowerCase()}`,
      })
      return recompute(next)
    }

    case 'RESOLVE_CONFLICT': {
      const conflict = record.conflicts.find((c) => c.id === action.conflictId)
      let next: PatientRecord = {
        ...record,
        conflicts: record.conflicts.map((c) =>
          c.id === action.conflictId
            ? {
                ...c,
                status: 'RESOLVED',
                resolutionNote: action.note,
                resolvedInFavorOf: action.resolvedInFavorOf,
              }
            : c,
        ),
      }
      next = audit(next, {
        actor: action.actor,
        action: 'CONFLICT_RESOLVED',
        detail: `Resolved conflict on ${conflict?.concept ?? ''}${
          action.resolvedInFavorOf ? ` in favour of ${action.resolvedInFavorOf}` : ''
        }: “${action.note}”`,
      })
      return next
    }

    case 'ACK_CONFLICT': {
      const conflict = record.conflicts.find((c) => c.id === action.conflictId)
      let next: PatientRecord = {
        ...record,
        conflicts: record.conflicts.map((c) =>
          c.id === action.conflictId ? { ...c, status: 'ACKNOWLEDGED' } : c,
        ),
      }
      next = audit(next, {
        actor: action.actor,
        action: 'CONFLICT_RESOLVED',
        detail: `Acknowledged conflict on ${conflict?.concept ?? ''} (kept both, no winner chosen)`,
      })
      return next
    }

    case 'ANSWER_CLARIFICATION': {
      let next: PatientRecord = {
        ...record,
        clarifications: record.clarifications.map((q) =>
          q.id === action.id ? { ...q, answered: true, answer: action.answer } : q,
        ),
      }
      next = audit(next, {
        actor: action.actor,
        action: 'CLARIFICATION_ANSWERED',
        detail: `Answered a clarification: “${action.answer}”`,
      })
      return next
    }

    default:
      return record
  }
}
