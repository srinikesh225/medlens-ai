/**
 * Structured extraction schema + validation — enforced with Zod.
 *
 * Every extraction — deterministic parser OR live LLM — MUST pass through
 * `validateExtraction` before any of it can become part of the patient record.
 * Malformed output is rejected, never partially trusted. A lab missing its
 * testName or value is a FATAL rejection; a malformed medication is dropped
 * (non-fatal). Unknown fields are stripped; confidence is coerced into [0,1].
 * This is the schema-validation gate that stops arbitrary model output from
 * writing straight into clinical state.
 */

import { z } from 'zod'

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

/** Coerce anything into a confidence in [0,1], defaulting to 0.8. */
const confidence = z.preprocess(
  (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8),
  z.number(),
)

const optionalText = z.string().trim().min(1).optional()

const LabSchema = z.object({
  testName: z.string().trim().min(1),
  valueRaw: z.string().trim().min(1),
  unit: optionalText,
  rangeRaw: z.string().trim().optional(),
  specimen: optionalText,
  observation: optionalText,
  confidence,
})

const MedicationSchema = z.object({
  name: z.string().trim().min(1),
  dose: optionalText,
  frequency: optionalText,
  status: z.enum(['ACTIVE', 'UNKNOWN', 'DISCONTINUED']).catch('UNKNOWN'),
  confidence,
})

function issuesToString(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || 'value'} ${i.message}`).join('; ')
}

/**
 * Validate raw output (e.g. JSON.parse of an LLM response) against the schema.
 */
export function validateExtraction(raw: unknown): ValidationResult {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: ['Extraction output is not an object.'] }
  }
  const obj = raw as Record<string, unknown>

  if (!Array.isArray(obj.labs)) errors.push('`labs` must be an array.')
  const labsIn = Array.isArray(obj.labs) ? obj.labs : []
  const medsIn = Array.isArray(obj.medications) ? obj.medications : []
  const warnings = (Array.isArray(obj.warnings) ? obj.warnings : []).filter(
    (w): w is string => typeof w === 'string',
  )

  const labs: ExtractedLab[] = []
  labsIn.forEach((l, i) => {
    const parsed = LabSchema.safeParse(l)
    if (!parsed.success) {
      errors.push(`labs[${i}]: ${issuesToString(parsed.error)}`)
      return
    }
    labs.push(parsed.data)
  })

  const medications: ExtractedMedication[] = []
  medsIn.forEach((m, i) => {
    const parsed = MedicationSchema.safeParse(m)
    if (!parsed.success) {
      errors.push(`medications[${i}]: ${issuesToString(parsed.error)}`)
      return
    }
    medications.push(parsed.data)
  })

  // Only lab / top-level problems are fatal; a bad medication is dropped.
  const fatal = errors.filter((e) => !e.startsWith('medications['))
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
