/**
 * Deterministic report-text extractor + the pluggable extractor interface.
 *
 * The deterministic extractor genuinely parses lab-report text (the format used
 * by the demo reports and many real tabular reports) into the validated
 * ExtractionOutput schema — no network, fully offline, reproducible. This is
 * what powers "paste/upload your own report" in the demo without an API key.
 *
 * A real LLM adapter (see anthropic.ts) implements the SAME interface, so the
 * pipeline is identical whether extraction is deterministic or model-driven.
 */

import type { ExtractedLab, ExtractedMedication, ExtractionOutput } from './schema'
import { validateExtraction } from './schema'

export interface Extractor {
  id: string
  label: string
  extract(text: string): Promise<ExtractionOutput>
}

const SEPARATOR = /^[-=_\s]+$/
const COLUMN_HEADER = /result/i
const RANGE_RE =
  /([<>]=?\s*-?\d[\d.,]*|-?\d[\d.,]*\s*(?:-|–|—|to)\s*-?\d[\d.,]*|not provided|not available|n\/a)/i
const VALUE_RE =
  /^([<>]?=?\s*-?\d[\d.,]*|positive|negative|reactive|non-reactive|trace|nil|detected|not detected)$/i
const UNIT_HINT = /[a-zµ%]/i

/** Parse one "Name   Value   Unit   Range" style row. Returns null if not a row. */
function parseLabRow(line: string): ExtractedLab | null {
  if (!line.trim() || SEPARATOR.test(line)) return null
  // Split on runs of 2+ spaces (column layout) — falls back to single spaces.
  let cols = line.trim().split(/\s{2,}/)
  if (cols.length < 2) cols = line.trim().split(/\s+/)
  if (cols.length < 2) return null

  const testName = cols[0].trim()
  if (!/[A-Za-z]/.test(testName)) return null
  if (COLUMN_HEADER.test(testName)) return null // this is the header row

  // Find the value: first remaining column that looks like a value.
  let valueRaw = ''
  let restCols: string[] = []
  for (let i = 1; i < cols.length; i++) {
    if (VALUE_RE.test(cols[i].trim())) {
      valueRaw = cols[i].trim().replace(/\s+/g, '')
      restCols = cols.slice(i + 1)
      break
    }
  }
  if (!valueRaw) return null

  const rest = restCols.join('  ').trim()
  let rangeRaw: string | undefined
  const rangeMatch = rest.match(RANGE_RE)
  let unitPart = rest
  if (rangeMatch) {
    rangeRaw = rangeMatch[0].trim()
    unitPart = rest.replace(rangeMatch[0], ' ').trim()
  }
  const unit = unitPart && UNIT_HINT.test(unitPart) ? unitPart.split(/\s{2,}/)[0].trim() : undefined

  return {
    testName,
    valueRaw,
    unit: unit || undefined,
    rangeRaw: rangeRaw || undefined,
    confidence: rangeRaw ? 0.97 : 0.9,
  }
}

/** Parse a "- Name dose — freq (status)" medication line. */
function parseMedLine(line: string): ExtractedMedication | null {
  const m = line.match(/^\s*[-*•]\s*(.+)$/)
  if (!m) return null
  const body = m[1].trim()
  // status in parentheses or trailing phrase
  let status: ExtractedMedication['status'] = 'UNKNOWN'
  if (/\bactive\b/i.test(body)) status = 'ACTIVE'
  else if (/\b(discontinued|stopped|ceased)\b/i.test(body)) status = 'DISCONTINUED'

  // name = leading words up to the first number/dose or em dash
  const nameMatch = body.match(/^([A-Za-z][A-Za-z0-9\-'’ ]*?)(?=\s+\d|\s+[-–—]|\s*\()/)
  const name = (nameMatch ? nameMatch[1] : body.split(/[-–—(]/)[0]).trim()
  if (!name) return null
  const doseMatch = body.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|units?))/i)
  const freqMatch = body.match(/(once|twice|three times|daily|nightly|bd|od|tds|at night|[0-9]+ times)/i)
  return {
    name,
    dose: doseMatch ? doseMatch[1] : undefined,
    frequency: freqMatch ? freqMatch[0] : undefined,
    status,
    confidence: 0.95,
  }
}

/** The core offline extractor. */
export function extractFromText(text: string): ExtractionOutput {
  const lines = text.split(/\r?\n/)
  const labs: ExtractedLab[] = []
  const medications: ExtractedMedication[] = []
  const warnings: string[] = []

  let inMeds = false
  for (const line of lines) {
    if (/medication|prescription/i.test(line) && !/\d/.test(line)) inMeds = true
    if (/^\s*(results?|lipid|complete blood|panel|additional)/i.test(line)) inMeds = false

    if (inMeds) {
      const med = parseMedLine(line)
      if (med) {
        medications.push(med)
        continue
      }
    }
    const lab = parseLabRow(line)
    if (lab) labs.push(lab)
  }

  const noRange = labs.filter((l) => !l.rangeRaw || /not provided|n\/a/i.test(l.rangeRaw)).length
  if (noRange) warnings.push(`${noRange} value(s) had no reference range in the source; they will not be range-checked.`)
  if (!labs.length && !medications.length)
    warnings.push('No structured lab rows or medications were recognized in this text.')

  return { labs, medications, warnings }
}

/** The default (offline, deterministic) extractor used unless a key is present. */
export const deterministicExtractor: Extractor = {
  id: 'medlens-demo-extractor',
  label: 'MedLens deterministic extractor (offline)',
  async extract(text: string): Promise<ExtractionOutput> {
    const raw = extractFromText(text)
    // Route through the SAME validation gate a real LLM response would face.
    const validated = validateExtraction(raw)
    if (!validated.ok || !validated.value) {
      throw new Error('Extraction failed schema validation: ' + validated.errors.join('; '))
    }
    return validated.value
  },
}
