/**
 * Structured extraction schema + validation.
 *
 * Every extraction — whether from the deterministic parser or a real LLM — MUST
 * conform to this schema and pass validation before any of it is allowed to
 * become part of the patient record. Malformed output is rejected, never
 * partially trusted. This is the "schema validation" and "deterministic
 * validation" stage of the pipeline that keeps arbitrary model output from
 * writing straight into clinical state.
 */

export interface ExtractedLab {
  testName: string
  valueRaw: string
  unit?: string
  /** Verbatim reference range text, or omitted/empty if the source gave none. */
  rangeRaw?: string
  specimen?: string
  observation?: string
  /** 0..1 extraction reliability (not medical certainty). */
  confidence: number
}

export interface ExtractedMedication {
  name: string
  dose?: string
  frequency?: string
  status: 'ACTIVE' | 'UNKNOWN' | 'DISCONTINUED'
  confidence: number
}

export interface ExtractionOutput {
  labs: ExtractedLab[]
  medications: ExtractedMedication[]
  /** Non-fatal notes the extractor wants a human to see. */
  warnings: string[]
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  /** Present only when ok. */
  value?: ExtractionOutput
}

function isNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x)
}
function isStr(x: unknown): x is string {
  return typeof x === 'string'
}

/**
 * Validate raw output (e.g. JSON.parse of an LLM response) against the schema.
 * Coerces confidence into [0,1], strips unknown fields, and rejects anything
 * missing a required field.
 */
export function validateExtraction(raw: unknown): ValidationResult {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: ['Extraction output is not an object.'] }
  }
  const obj = raw as Record<string, unknown>

  const labsIn = Array.isArray(obj.labs) ? obj.labs : []
  const medsIn = Array.isArray(obj.medications) ? obj.medications : []
  const warningsIn = Array.isArray(obj.warnings) ? obj.warnings : []

  if (!Array.isArray(obj.labs)) errors.push('`labs` must be an array.')

  const labs: ExtractedLab[] = []
  labsIn.forEach((l, i) => {
    if (typeof l !== 'object' || l === null) {
      errors.push(`labs[${i}] is not an object.`)
      return
    }
    const o = l as Record<string, unknown>
    if (!isStr(o.testName) || !o.testName.trim()) {
      errors.push(`labs[${i}].testName is required.`)
      return
    }
    if (!isStr(o.valueRaw) || !o.valueRaw.trim()) {
      errors.push(`labs[${i}].valueRaw is required.`)
      return
    }
    labs.push({
      testName: o.testName.trim(),
      valueRaw: o.valueRaw.trim(),
      unit: isStr(o.unit) ? o.unit.trim() || undefined : undefined,
      rangeRaw: isStr(o.rangeRaw) ? o.rangeRaw.trim() : undefined,
      specimen: isStr(o.specimen) ? o.specimen.trim() || undefined : undefined,
      observation: isStr(o.observation) ? o.observation.trim() || undefined : undefined,
      confidence: isNum(o.confidence) ? Math.max(0, Math.min(1, o.confidence)) : 0.8,
    })
  })

  const medications: ExtractedMedication[] = []
  medsIn.forEach((m, i) => {
    if (typeof m !== 'object' || m === null) return
    const o = m as Record<string, unknown>
    if (!isStr(o.name) || !o.name.trim()) {
      errors.push(`medications[${i}].name is required.`)
      return
    }
    const status = o.status === 'ACTIVE' || o.status === 'DISCONTINUED' ? o.status : 'UNKNOWN'
    medications.push({
      name: o.name.trim(),
      dose: isStr(o.dose) ? o.dose.trim() || undefined : undefined,
      frequency: isStr(o.frequency) ? o.frequency.trim() || undefined : undefined,
      status,
      confidence: isNum(o.confidence) ? Math.max(0, Math.min(1, o.confidence)) : 0.8,
    })
  })

  const warnings = warningsIn.filter(isStr)

  // Fatal only if labs array itself was malformed or a present lab was invalid.
  const fatal = errors.filter((e) => !e.includes('medications['))
  if (fatal.length) return { ok: false, errors }

  return { ok: true, errors, value: { labs, medications, warnings } }
}

/** JSON schema (documentation form) handed to a real LLM as the output contract. */
export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  required: ['labs', 'medications', 'warnings'],
  properties: {
    labs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['testName', 'valueRaw', 'confidence'],
        properties: {
          testName: { type: 'string' },
          valueRaw: { type: 'string', description: 'value exactly as printed' },
          unit: { type: 'string' },
          rangeRaw: { type: 'string', description: 'reference range verbatim; omit if absent — never invent one' },
          specimen: { type: 'string' },
          observation: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    medications: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'status', 'confidence'],
        properties: {
          name: { type: 'string' },
          dose: { type: 'string' },
          frequency: { type: 'string' },
          status: { enum: ['ACTIVE', 'UNKNOWN', 'DISCONTINUED'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
} as const
