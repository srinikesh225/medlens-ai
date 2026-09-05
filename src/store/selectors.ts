import type { Conflict, LabResult, PatientRecord, SourceType } from '@/domain/types'

/** Is a lab value implicated in a still-open conflict? */
export function labInOpenConflict(lab: LabResult, conflicts: Conflict[]): boolean {
  return conflicts.some(
    (c) =>
      c.status === 'OPEN' &&
      (c.concept === lab.testName || c.concept.toLowerCase() === lab.testName.toLowerCase()) &&
      c.evidence.some((e) => e.reportId === lab.reportId),
  )
}

/**
 * The provenance badge to show for a lab, honouring the badge system:
 *   conflict (open) > human verified/edited > original source type.
 */
export function badgeForLab(lab: LabResult, conflicts: Conflict[]): SourceType {
  if (labInOpenConflict(lab, conflicts)) return 'CONFLICT'
  if (lab.verification === 'VERIFIED' || lab.verification === 'EDITED') return 'HUMAN_VERIFIED'
  return lab.provenance.sourceType
}

export interface RecordStats {
  totalLabs: number
  verified: number
  unreviewed: number
  rejected: number
  abnormal: number // LOW or HIGH
  missingRange: number
  openConflicts: number
  openClarifications: number
  reports: number
  verifiedPct: number
}

export function recordStats(record: PatientRecord): RecordStats {
  const active = record.labs.filter((l) => l.verification !== 'REJECTED')
  const verified = record.labs.filter(
    (l) => l.verification === 'VERIFIED' || l.verification === 'EDITED',
  ).length
  const unreviewed = record.labs.filter((l) => l.verification === 'UNREVIEWED').length
  const rejected = record.labs.filter((l) => l.verification === 'REJECTED').length
  const abnormal = active.filter((l) => l.status === 'LOW' || l.status === 'HIGH').length
  const missingRange = active.filter((l) => l.referenceRange.unavailable).length
  return {
    totalLabs: record.labs.length,
    verified,
    unreviewed,
    rejected,
    abnormal,
    missingRange,
    openConflicts: record.conflicts.filter((c) => c.status === 'OPEN').length,
    openClarifications: record.clarifications.filter((q) => !q.answered).length,
    reports: record.reports.length,
    verifiedPct: record.labs.length ? Math.round((verified / record.labs.length) * 100) : 0,
  }
}

export interface LabFilters {
  query: string
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  status: 'ALL' | 'ABNORMAL' | 'WITHIN' | 'UNKNOWN'
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  verification: 'ALL' | 'VERIFIED' | 'UNREVIEWED' | 'REJECTED'
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  reportId: 'ALL' | string
}

export const DEFAULT_FILTERS: LabFilters = {
  query: '',
  status: 'ALL',
  verification: 'ALL',
  reportId: 'ALL',
}

export function filterLabs(labs: LabResult[], f: LabFilters): LabResult[] {
  const q = f.query.trim().toLowerCase()
  return labs.filter((l) => {
    if (q && !`${l.testName} ${l.valueRaw} ${l.unit ?? ''}`.toLowerCase().includes(q)) return false
    if (f.status === 'ABNORMAL' && !(l.status === 'LOW' || l.status === 'HIGH')) return false
    if (f.status === 'WITHIN' && l.status !== 'WITHIN_RANGE') return false
    if (f.status === 'UNKNOWN' && l.status !== 'UNKNOWN') return false
    if (f.verification === 'VERIFIED' && !(l.verification === 'VERIFIED' || l.verification === 'EDITED'))
      return false
    if (f.verification === 'UNREVIEWED' && l.verification !== 'UNREVIEWED') return false
    if (f.verification === 'REJECTED' && l.verification !== 'REJECTED') return false
    if (f.reportId !== 'ALL' && l.reportId !== f.reportId) return false
    return true
  })
}
