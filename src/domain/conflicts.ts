/**
 * Conflict detection — deterministic, non-clinical.
 *
 * PRINCIPLE: MedLens never decides which conflicting value is "correct". It only
 * SURFACES disagreements so a human can resolve them. Detecting a conflict is an
 * information-integrity check, not a medical judgement.
 */

import type {
  Allergy,
  Conflict,
  LabResult,
  Medication,
  PatientRecord,
  Report,
} from './types'
import { makeId, normalizeKey } from './util'

/** Two numeric values "materially" differ (default: >5% relative, or clear absolute). */
function materiallyDiffers(a: number, b: number, rel = 0.05): boolean {
  const diff = Math.abs(a - b)
  if (diff < 1e-9) return false
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-9)
  return diff / scale > rel
}

function labsByKey(labs: LabResult[]): Map<string, LabResult[]> {
  const map = new Map<string, LabResult[]>()
  for (const l of labs) {
    const arr = map.get(l.normalizedKey) ?? []
    arr.push(l)
    map.set(l.normalizedKey, arr)
  }
  return map
}

/** Same test + SAME date but different values → a genuine conflict (not a trend). */
function detectValueMismatches(labs: LabResult[]): Conflict[] {
  const out: Conflict[] = []
  for (const [, group] of labsByKey(labs)) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        if (a.date !== b.date) continue // different dates → belongs to trend, not conflict
        if (a.valueNum === undefined || b.valueNum === undefined) continue
        // Different units aren't a value disagreement — they're a UNIT_MISMATCH,
        // reported separately. Comparing 96 mg/dL to 5.6 mmol/L as a value
        // conflict would be misleading, so we skip it here.
        const ua = (a.unit ?? '').trim().toLowerCase()
        const ub = (b.unit ?? '').trim().toLowerCase()
        if (ua && ub && ua !== ub) continue
        if (!materiallyDiffers(a.valueNum, b.valueNum)) continue
        out.push({
          id: makeId('cf'),
          kind: 'VALUE_MISMATCH',
          concept: a.testName,
          summary: `Two reports dated ${a.date} give different ${a.testName} values (${a.valueRaw}${a.unit ? ' ' + a.unit : ''} vs ${b.valueRaw}${b.unit ? ' ' + b.unit : ''}).`,
          evidence: [a, b].map((l) => ({
            label: l.provenance.reportTitle ?? 'Report',
            value: `${l.valueRaw}${l.unit ? ' ' + l.unit : ''}`,
            reportId: l.reportId,
            reportTitle: l.provenance.reportTitle,
            date: l.date,
            span: l.provenance.span,
          })),
          status: 'OPEN',
        })
      }
    }
  }
  return out
}

/** Same test reported in incompatible units across reports. */
function detectUnitMismatches(labs: LabResult[]): Conflict[] {
  const out: Conflict[] = []
  for (const [, group] of labsByKey(labs)) {
    const units = new Set(group.map((l) => (l.unit ?? '').trim().toLowerCase()).filter(Boolean))
    if (units.size > 1) {
      out.push({
        id: makeId('cf'),
        kind: 'UNIT_MISMATCH',
        concept: group[0].testName,
        summary: `${group[0].testName} is reported in more than one unit (${[...units].join(', ')}). Values may not be directly comparable.`,
        evidence: group.map((l) => ({
          label: l.provenance.reportTitle ?? 'Report',
          value: `${l.valueRaw} ${l.unit ?? ''}`.trim(),
          reportId: l.reportId,
          reportTitle: l.provenance.reportTitle,
          date: l.date,
          span: l.provenance.span,
        })),
        status: 'OPEN',
      })
    }
  }
  return out
}

/** Two uploaded reports that look like the same document (same lab, date, kind). */
function detectDuplicateReports(reports: Report[]): Conflict[] {
  const out: Conflict[] = []
  const seen = new Map<string, Report>()
  for (const r of reports) {
    const key = `${(r.labName ?? '').toLowerCase()}|${r.reportDate}|${r.kind}`
    const prior = seen.get(key)
    if (prior) {
      out.push({
        id: makeId('cf'),
        kind: 'DUPLICATE_REPORT',
        concept: r.title,
        summary: `Two uploads appear to be the same report (${r.labName ?? 'lab'}, ${r.reportDate}). Confirm whether one is a duplicate.`,
        evidence: [prior, r].map((rr) => ({
          label: rr.title,
          value: `${rr.labName ?? 'lab'} · ${rr.reportDate}`,
          reportId: rr.id,
          reportTitle: rr.title,
          date: rr.reportDate,
        })),
        status: 'OPEN',
      })
    } else {
      seen.set(key, r)
    }
  }
  return out
}

/** A lab/report dated after the review date is chronologically impossible. */
function detectImpossibleChronology(labs: LabResult[], now: string): Conflict[] {
  const nowMs = new Date(now).getTime()
  const out: Conflict[] = []
  for (const l of labs) {
    if (new Date(l.date).getTime() > nowMs) {
      out.push({
        id: makeId('cf'),
        kind: 'IMPOSSIBLE_CHRONOLOGY',
        concept: l.testName,
        summary: `${l.testName} is dated ${l.date}, which is after the current review date. Check the source date.`,
        evidence: [
          {
            label: l.provenance.reportTitle ?? 'Report',
            value: `dated ${l.date}`,
            reportId: l.reportId,
            reportTitle: l.provenance.reportTitle,
            date: l.date,
            span: l.provenance.span,
          },
        ],
        status: 'OPEN',
      })
    }
  }
  return out
}

/** Medications whose active/discontinued status is unknown or contradictory. */
function detectMedicationStatus(meds: Medication[]): Conflict[] {
  const out: Conflict[] = []
  const byName = new Map<string, Medication[]>()
  for (const m of meds) {
    const k = normalizeKey(m.name)
    const arr = byName.get(k) ?? []
    arr.push(m)
    byName.set(k, arr)
  }
  for (const [, group] of byName) {
    const statuses = new Set(group.map((m) => m.status))
    if (statuses.has('ACTIVE') && statuses.has('DISCONTINUED')) {
      out.push({
        id: makeId('cf'),
        kind: 'MEDICATION_STATUS',
        concept: group[0].name,
        summary: `${group[0].name} appears as both active and discontinued across sources. Confirm its current status.`,
        evidence: group.map((m) => ({
          label: m.provenance.reportTitle ?? m.provenance.sourceType,
          value: `${m.name} — ${m.status.toLowerCase()}`,
          reportId: m.provenance.reportId,
          reportTitle: m.provenance.reportTitle,
        })),
        status: 'OPEN',
      })
    }
  }
  return out
}

/**
 * Information-integrity cross-check: a substance recorded as an ALLERGY also
 * appears among the medication list. This is a REVIEW FLAG, not medical advice —
 * we only match on literal substance names (no drug-class inference), and we
 * never tell anyone to start or stop a medication.
 */
function detectAllergyMedicationOverlap(allergies: Allergy[], meds: Medication[]): Conflict[] {
  const out: Conflict[] = []
  for (const a of allergies) {
    const allergyKey = normalizeKey(a.substance)
    if (!allergyKey) continue
    for (const m of meds) {
      const medKey = normalizeKey(m.name)
      if (!medKey) continue
      if (medKey === allergyKey || medKey.includes(allergyKey) || allergyKey.includes(medKey)) {
        out.push({
          id: makeId('cf'),
          kind: 'ALLERGY_INCONSISTENCY',
          concept: a.substance,
          summary: `A recorded allergy (${a.substance}) shares a name with a listed medication (${m.name}). Flagged for human review — MedLens does not assess clinical significance.`,
          evidence: [
            {
              label: 'Recorded allergy',
              value: a.substance + (a.reaction ? ` (${a.reaction})` : ''),
              reportId: a.provenance.reportId,
              reportTitle: a.provenance.reportTitle,
            },
            {
              label: 'Listed medication',
              value: `${m.name}${m.dose ? ' ' + m.dose : ''}`,
              reportId: m.provenance.reportId,
              reportTitle: m.provenance.reportTitle,
            },
          ],
          status: 'OPEN',
        })
      }
    }
  }
  return out
}

/**
 * Run all detectors. Preserves prior human resolutions: if a previously found
 * conflict (matched by kind+concept) was resolved/acknowledged, we keep that.
 */
export function detectConflicts(
  record: Pick<PatientRecord, 'labs' | 'medications' | 'allergies' | 'reports' | 'conflicts'>,
  now = new Date().toISOString(),
): Conflict[] {
  const fresh: Conflict[] = [
    ...detectValueMismatches(record.labs),
    ...detectUnitMismatches(record.labs),
    ...detectDuplicateReports(record.reports),
    ...detectImpossibleChronology(record.labs, now),
    ...detectMedicationStatus(record.medications),
    ...detectAllergyMedicationOverlap(record.allergies, record.medications),
  ]

  // Carry forward prior resolution state, matched by a stable signature.
  const priorBySig = new Map<string, (typeof record.conflicts)[number]>()
  for (const c of record.conflicts) {
    priorBySig.set(`${c.kind}|${c.concept}`, c)
  }
  return fresh.map((c) => {
    const prior = priorBySig.get(`${c.kind}|${c.concept}`)
    if (prior && prior.status !== 'OPEN') {
      return {
        ...c,
        id: prior.id,
        status: prior.status,
        resolutionNote: prior.resolutionNote,
        resolvedInFavorOf: prior.resolvedInFavorOf,
      }
    }
    return c
  })
}
