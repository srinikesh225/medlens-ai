/**
 * Deterministic, safety-gated summary composer.
 *
 * The summary is BUILT FROM the structured record (not free-form generated), so
 * it can only ever state what the data supports. Every composed summary is then
 * run through the safety linter; if any section trips a diagnostic/prescriptive
 * rule, that section is withheld rather than shown. This makes an unsafe summary
 * structurally hard to produce.
 */

import type { PatientRecord, TrendSeries } from './types'
import { lintSafety, SAFETY_DISCLAIMER } from './safety'
import { formatDate } from './util'
import { statusLabel } from './referenceRange'

export interface SummarySection {
  heading: string
  lines: string[]
  /** True if the section passed the safety lint. Unsafe sections are withheld. */
  safe: boolean
}

export interface PatientSummary {
  disclaimer: string
  generatedAt: string
  sections: SummarySection[]
  /** Diagnostics: total safety violations caught (should always be 0). */
  violationsCaught: number
}

export function composeSummary(
  record: PatientRecord,
  trends: TrendSeries[],
  now = new Date().toISOString(),
): PatientSummary {
  const sections: Omit<SummarySection, 'safe'>[] = []

  // 1. Information Available
  const info: string[] = []
  const d = record.demographics
  info.push(
    `Record for ${d.name || 'the patient'}${d.age != null ? `, age ${d.age}` : ''}${d.sex ? `, ${d.sex.toLowerCase()}` : ''} (ID ${d.patientId}).`,
  )
  info.push(
    `${record.reports.length} report${record.reports.length === 1 ? '' : 's'} on file, ` +
      `containing ${record.labs.length} recorded laboratory value${record.labs.length === 1 ? '' : 's'}.`,
  )
  if (record.conditions.length)
    info.push(`Recorded conditions: ${record.conditions.map((c) => c.name).join(', ')}.`)
  if (record.allergies.length)
    info.push(`Recorded allergies: ${record.allergies.map((a) => a.substance).join(', ')}.`)
  if (record.medications.length)
    info.push(
      `Listed medications: ${record.medications.map((m) => `${m.name}${m.status !== 'ACTIVE' ? ` (${m.status.toLowerCase()})` : ''}`).join(', ')}.`,
    )
  sections.push({ heading: 'Information Available', lines: info })

  // 2. Reported Findings — verbatim status against SOURCE ranges only
  const findings: string[] = []
  const verified = record.labs.filter((l) => l.verification === 'VERIFIED')
  const notable = record.labs.filter((l) => l.status === 'LOW' || l.status === 'HIGH')
  if (notable.length) {
    for (const l of notable.slice(0, 8)) {
      findings.push(
        `${l.testName}: ${l.valueRaw}${l.unit ? ' ' + l.unit : ''} — ${statusLabel(l.status).toLowerCase()} ` +
          `versus the range printed in the source (${l.referenceRange.unavailable ? 'no range provided' : l.referenceRange.raw}), from ${l.provenance.reportTitle ?? 'a report'} dated ${formatDate(l.date)}.`,
      )
    }
  } else {
    findings.push('No laboratory value fell outside the reference range printed in its source report.')
  }
  const noRange = record.labs.filter((l) => l.referenceRange.unavailable).length
  if (noRange)
    findings.push(
      `${noRange} value${noRange === 1 ? '' : 's'} could not be range-checked because the source report did not provide a reference range.`,
    )
  findings.push(`${verified.length} of ${record.labs.length} values have been human-verified.`)
  sections.push({ heading: 'Reported Findings', lines: findings })

  // 3. Changes Over Time — DATA description only (trends.ts guarantees neutrality)
  const changes: string[] = []
  if (trends.length) {
    for (const t of trends.slice(0, 6)) {
      changes.push(`${t.testName}${t.unit ? ` (${t.unit})` : ''}: ${t.dataNote}`)
    }
    changes.push(
      'These describe the reported numbers only and are not a clinical interpretation of the patient’s health.',
    )
  } else {
    changes.push('Not enough repeated measurements to describe a trend for any single test.')
  }
  sections.push({ heading: 'Changes Over Time', lines: changes })

  // 4. Missing / Unclear Information
  const missing: string[] = []
  if (!d.dateOfBirth) missing.push('Date of birth is not recorded.')
  if (noRange) missing.push(`${noRange} laboratory value(s) lack a reference range in the source.`)
  const unknownMeds = record.medications.filter((m) => m.status === 'UNKNOWN')
  if (unknownMeds.length)
    missing.push(
      `Current status is unclear for: ${unknownMeds.map((m) => m.name).join(', ')}.`,
    )
  const openClar = record.clarifications.filter((q) => !q.answered)
  if (openClar.length)
    missing.push(`${openClar.length} clarification question(s) are awaiting an answer.`)
  if (!missing.length) missing.push('No critical gaps detected in the available information.')
  sections.push({ heading: 'Missing / Unclear Information', lines: missing })

  // 5. Items Requiring Human Review
  const review: string[] = []
  const openConflicts = record.conflicts.filter((c) => c.status === 'OPEN')
  if (openConflicts.length) {
    review.push(`${openConflicts.length} potential conflict(s) are open for review:`)
    for (const c of openConflicts.slice(0, 5)) review.push(`• ${c.summary}`)
  }
  const unverified = record.labs.filter((l) => l.verification === 'UNREVIEWED').length
  if (unverified) review.push(`${unverified} extracted value(s) have not yet been reviewed.`)
  if (!review.length) review.push('All extracted items have been reviewed and no conflicts are open.')
  sections.push({ heading: 'Items Requiring Human Review', lines: review })

  // Safety gate: lint every section; withhold any that trips a rule.
  let violationsCaught = 0
  const gated: SummarySection[] = sections.map((s) => {
    const joined = s.lines.join(' \n ')
    const violations = lintSafety(joined)
    if (violations.length) {
      violationsCaught += violations.length
      return {
        heading: s.heading,
        safe: false,
        lines: ['[Section withheld: content failed the responsible-AI safety check.]'],
      }
    }
    return { ...s, safe: true }
  })

  return {
    disclaimer: SAFETY_DISCLAIMER,
    generatedAt: now,
    sections: gated,
    violationsCaught,
  }
}
