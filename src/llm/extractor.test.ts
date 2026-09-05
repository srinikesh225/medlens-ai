import { describe, it, expect } from 'vitest'
import { extractFromText, deterministicExtractor } from './extractor'
import { SAMPLE_REPORTS } from '@/demo/samples'
import { evaluate } from '@/domain/referenceRange'

describe('deterministic extractor', () => {
  it('parses a thyroid panel into structured labs with verbatim ranges', () => {
    const out = extractFromText(SAMPLE_REPORTS[0].text)
    const tsh = out.labs.find((l) => l.testName === 'TSH')
    expect(tsh).toBeTruthy()
    expect(tsh!.valueRaw).toBe('5.9')
    expect(tsh!.unit).toBe('uIU/mL')
    expect(tsh!.rangeRaw).toBe('0.4 - 4.0')
    // range engine then computes HIGH from the SOURCE range
    expect(evaluate(tsh!.valueRaw, tsh!.rangeRaw).status).toBe('HIGH')
  })

  it('does not fabricate a range when the source says "Not provided"', () => {
    const out = extractFromText(SAMPLE_REPORTS[0].text)
    const antiTpo = out.labs.find((l) => l.testName === 'Anti-TPO')!
    expect(evaluate(antiTpo.valueRaw, antiTpo.rangeRaw).range.unavailable).toBe(true)
    expect(out.warnings.some((w) => /no reference range/i.test(w))).toBe(true)
  })

  it('handles qualitative (non-numeric) results without inventing a status', () => {
    const out = extractFromText(SAMPLE_REPORTS[1].text)
    const ketones = out.labs.find((l) => l.testName === 'Ketones')!
    expect(ketones.valueRaw.toLowerCase()).toBe('positive')
    expect(evaluate(ketones.valueRaw, ketones.rangeRaw).status).toBe('UNEVALUABLE')
  })

  it('routes every extraction through schema validation', async () => {
    const out = await deterministicExtractor.extract(SAMPLE_REPORTS[0].text)
    expect(out.labs.length).toBeGreaterThan(2)
    for (const l of out.labs) {
      expect(typeof l.testName).toBe('string')
      expect(typeof l.valueRaw).toBe('string')
      expect(l.confidence).toBeGreaterThan(0)
    }
  })
})
