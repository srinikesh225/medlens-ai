import { describe, it, expect } from 'vitest'
import { lintSafety, isSafe } from './safety'

describe('safety linter catches medical overreach', () => {
  it('flags diagnostic claims', () => {
    expect(isSafe('The patient has diabetes.')).toBe(false)
    expect(isSafe('This means the patient has anemia.')).toBe(false)
    expect(lintSafety('A diagnosis of hypertension is likely.')[0].category).toBe('DIAGNOSIS')
  })

  it('flags prescriptive / medication-change language', () => {
    expect(isSafe('You should stop your medication.')).toBe(false)
    expect(isSafe('We recommend you start Metformin.')).toBe(false)
    expect(isSafe('Increase the dose of your tablet.')).toBe(false)
  })

  it('flags dosage instructions', () => {
    expect(isSafe('Take 500 mg twice daily.')).toBe(false)
  })

  it('flags treatment recommendations', () => {
    expect(isSafe('You need surgery for this.')).toBe(false)
  })

  it('flags clinical interpretation of a trend', () => {
    expect(isSafe('Your condition has improved.')).toBe(false)
  })

  it('ALLOWS neutral, data-only language that MedLens is meant to produce', () => {
    expect(isSafe('Reported hemoglobin values increased across the available reports (12.1 → 13.2).')).toBe(true)
    expect(isSafe('Hemoglobin 13.2 g/dL is within the range printed in the source (12.0–16.0).')).toBe(true)
    expect(isSafe('2 values could not be range-checked because the source did not provide a reference range.')).toBe(true)
    expect(isSafe('This value has not yet been reviewed by a human.')).toBe(true)
  })
})
