import { describe, it, expect } from 'vitest'
import {
  parseNumeric,
  parseReferenceRange,
  classifyValue,
  evaluate,
} from './referenceRange'

describe('parseNumeric', () => {
  it('parses plain and decimal numbers', () => {
    expect(parseNumeric('13.2')).toBe(13.2)
    expect(parseNumeric('  0.83 ')).toBe(0.83)
    expect(parseNumeric('1,200')).toBe(1200)
    expect(parseNumeric('-0.5')).toBe(-0.5)
  })
  it('rejects qualitative / mixed values', () => {
    expect(parseNumeric('Positive')).toBeUndefined()
    expect(parseNumeric('Trace')).toBeUndefined()
    expect(parseNumeric('Grade 2 of 4')).toBeUndefined()
    expect(parseNumeric('')).toBeUndefined()
    expect(parseNumeric(undefined)).toBeUndefined()
  })
})

describe('parseReferenceRange — two-sided', () => {
  it('parses hyphen ranges', () => {
    const r = parseReferenceRange('12.0 - 16.0')
    expect(r.unavailable).toBe(false)
    expect(r.low).toBe(12)
    expect(r.high).toBe(16)
  })
  it('parses en-dash and em-dash ranges with a unit', () => {
    expect(parseReferenceRange('12.0–16.0 g/dL')).toMatchObject({ low: 12, high: 16, unit: 'g/dL' })
    expect(parseReferenceRange('3.5—5.1 mmol/L')).toMatchObject({ low: 3.5, high: 5.1 })
  })
  it('parses "a to b"', () => {
    expect(parseReferenceRange('0.0 to 5.0')).toMatchObject({ low: 0, high: 5 })
  })
  it('normalizes reversed bounds', () => {
    expect(parseReferenceRange('16.0 - 12.0')).toMatchObject({ low: 12, high: 16 })
  })
})

describe('parseReferenceRange — one-sided inequalities', () => {
  it('parses upper bounds', () => {
    expect(parseReferenceRange('< 200')).toMatchObject({ high: 200, unavailable: false })
    expect(parseReferenceRange('<150')).toMatchObject({ high: 150 })
    expect(parseReferenceRange('≤ 5.7')).toMatchObject({ high: 5.7 })
    expect(parseReferenceRange('<= 40')).toMatchObject({ high: 40 })
  })
  it('parses lower bounds', () => {
    expect(parseReferenceRange('> 40')).toMatchObject({ low: 40, unavailable: false })
    expect(parseReferenceRange('>=13')).toMatchObject({ low: 13 })
    expect(parseReferenceRange('≥ 60')).toMatchObject({ low: 60 })
  })
})

describe('parseReferenceRange — unavailable / malformed (NEVER guessed)', () => {
  it('treats empty tokens as unavailable', () => {
    for (const t of ['', '-', '—', 'N/A', 'na', 'None', 'Not provided', 'not reported']) {
      expect(parseReferenceRange(t).unavailable).toBe(true)
    }
  })
  it('treats a bare single number as unavailable (ambiguous bound)', () => {
    expect(parseReferenceRange('140').unavailable).toBe(true)
  })
  it('treats qualitative ranges as numerically unavailable but keeps raw', () => {
    const r = parseReferenceRange('Negative')
    expect(r.unavailable).toBe(true)
    expect(r.raw).toBe('Negative')
  })
})

describe('classifyValue — the core safety contract', () => {
  it('LOW when below the lower bound', () => {
    expect(classifyValue('11.0', parseReferenceRange('12.0 - 16.0'))).toBe('LOW')
  })
  it('WITHIN_RANGE at the bounds (inclusive) and inside', () => {
    const r = parseReferenceRange('12.0 - 16.0')
    expect(classifyValue('12.0', r)).toBe('WITHIN_RANGE')
    expect(classifyValue('13.2', r)).toBe('WITHIN_RANGE')
    expect(classifyValue('16.0', r)).toBe('WITHIN_RANGE')
  })
  it('HIGH when above the upper bound', () => {
    expect(classifyValue('17.4', parseReferenceRange('12.0 - 16.0'))).toBe('HIGH')
  })
  it('handles one-sided ranges', () => {
    expect(classifyValue('210', parseReferenceRange('< 200'))).toBe('HIGH')
    expect(classifyValue('180', parseReferenceRange('< 200'))).toBe('WITHIN_RANGE')
    expect(classifyValue('35', parseReferenceRange('> 40'))).toBe('LOW')
    expect(classifyValue('55', parseReferenceRange('> 40'))).toBe('WITHIN_RANGE')
  })
  it('returns UNKNOWN — never a guess — when the source gives no range', () => {
    expect(classifyValue('13.2', parseReferenceRange(''))).toBe('UNKNOWN')
    expect(classifyValue('13.2', parseReferenceRange('N/A'))).toBe('UNKNOWN')
    expect(classifyValue('13.2', parseReferenceRange('140'))).toBe('UNKNOWN')
  })
  it('returns UNKNOWN for a non-numeric value even with a numeric range', () => {
    expect(classifyValue('Positive', parseReferenceRange('< 200'))).toBe('UNKNOWN')
  })
})

describe('evaluate — end to end', () => {
  it('mirrors the demo example: Hemoglobin 13.2 in 12.0–16.0', () => {
    const { range, status } = evaluate('13.2', '12.0 - 16.0')
    expect(status).toBe('WITHIN_RANGE')
    expect(range.low).toBe(12)
    expect(range.high).toBe(16)
  })
  it('never fabricates a range for a value whose source omitted it', () => {
    const { range, status } = evaluate('540', 'Not provided')
    expect(range.unavailable).toBe(true)
    expect(status).toBe('UNKNOWN')
  })
})
