import { describe, it, expect } from 'vitest'
import { validateExtraction } from './schema'

describe('validateExtraction (Zod gate)', () => {
  it('accepts a well-formed payload and coerces confidence into [0,1]', () => {
    const r = validateExtraction({
      labs: [{ testName: 'Hemoglobin', valueRaw: '13.2', unit: 'g/dL', rangeRaw: '12.0 - 16.0', confidence: 5 }],
      medications: [{ name: 'Metformin', status: 'ACTIVE', confidence: 0.9 }],
      warnings: ['note'],
    })
    expect(r.ok).toBe(true)
    expect(r.value!.labs[0].confidence).toBe(1) // clamped from 5
    expect(r.value!.warnings).toEqual(['note'])
  })

  it('REJECTS (fatal) a lab missing testName or valueRaw — never written', () => {
    const r = validateExtraction({ labs: [{ valueRaw: '13.2', confidence: 0.9 }], medications: [], warnings: [] })
    expect(r.ok).toBe(false)
    expect(r.value).toBeUndefined()
    expect(r.errors.join(' ')).toMatch(/labs\[0\]/)
  })

  it('rejects a non-object payload', () => {
    expect(validateExtraction('nope').ok).toBe(false)
    expect(validateExtraction(null).ok).toBe(false)
  })

  it('drops a malformed medication without failing the whole extraction', () => {
    const r = validateExtraction({
      labs: [{ testName: 'Glucose', valueRaw: '96', confidence: 0.9 }],
      medications: [{ dose: '500mg' }], // no name → invalid, dropped
      warnings: [],
    })
    expect(r.ok).toBe(true)
    expect(r.value!.medications).toHaveLength(0)
  })

  it('strips unknown fields and defaults an unknown medication status to UNKNOWN', () => {
    const r = validateExtraction({
      labs: [{ testName: 'TSH', valueRaw: '5.9', confidence: 0.9, injected: 'x' }],
      medications: [{ name: 'Aspirin', status: 'bogus', confidence: 0.9 }],
      warnings: [],
    })
    expect(r.ok).toBe(true)
    expect((r.value!.labs[0] as unknown as Record<string, unknown>).injected).toBeUndefined()
    expect(r.value!.medications[0].status).toBe('UNKNOWN')
  })
})
