import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TOKENS, cssVarName, toChannels, STATUS_HEX, type TokenName } from './tokens'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const config = readFileSync(resolve(process.cwd(), 'tailwind.config.ts'), 'utf8')

/** Every `--name: r g b;` declaration in the :root block. */
function declaredVars(): Map<string, string> {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('@layer base'))
  const out = new Map<string, string>()
  for (const m of root.matchAll(/(--[\w-]+):\s*([\d\s]+);/g)) out.set(m[1], m[2].trim())
  return out
}

describe('design tokens stay in sync across the three layers', () => {
  const vars = declaredVars()

  it('every token in tokens.ts has a matching CSS variable with the same colour', () => {
    const mismatches: string[] = []
    for (const name of Object.keys(TOKENS) as TokenName[]) {
      const v = cssVarName(name)
      const declared = vars.get(v)
      if (declared === undefined) mismatches.push(`${name}: no ${v} in index.css`)
      else if (declared !== toChannels(TOKENS[name]))
        mismatches.push(`${name}: index.css has "${declared}", tokens.ts has "${toChannels(TOKENS[name])}"`)
    }
    expect(mismatches).toEqual([])
  })

  it('index.css declares no CSS variable that tokens.ts does not define', () => {
    const known = new Set((Object.keys(TOKENS) as TokenName[]).map(cssVarName))
    expect([...vars.keys()].filter((v) => !known.has(v))).toEqual([])
  })

  it('the Tailwind theme references every CSS variable', () => {
    const missing = [...vars.keys()].filter((v) => !config.includes(`var(${v})`) && !config.includes(`'${v}'`))
    expect(missing).toEqual([])
  })
})

describe('contrast', () => {
  const lum = (hex: string) => {
    const s = hex.replace('#', '')
    const ch = [0, 2, 4]
      .map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  }
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  const SURFACES = [TOKENS.canvas, TOKENS.card, TOKENS.sunken]

  it('every text colour clears WCAG AA (4.5:1) on every surface', () => {
    // `faint` is deliberately excluded: it is a NON-TEXT token (icon strokes,
    // chart gridlines). The lint script has no way to prove that, so the rule
    // is stated here and in tokens.ts.
    const textTokens = { ink: TOKENS.ink, secondary: TOKENS.secondary, muted: TOKENS.muted }
    const failures: string[] = []
    for (const [name, hex] of Object.entries(textTokens))
      for (const surface of SURFACES) {
        const r = ratio(hex, surface)
        if (r < 4.5) failures.push(`${name} on ${surface}: ${r.toFixed(2)}:1`)
      }
    expect(failures).toEqual([])
  })

  it('every status and provenance badge pair clears WCAG AA', () => {
    const pairs: [string, string, string][] = [
      ['status.low', TOKENS.statusLow, TOKENS.statusLowBg],
      ['status.normal', TOKENS.statusNormal, TOKENS.statusNormalBg],
      ['status.high', TOKENS.statusHigh, TOKENS.statusHighBg],
      ['status.unknown', TOKENS.statusUnknown, TOKENS.statusUnknownBg],
      ['status.conflict', TOKENS.statusConflict, TOKENS.statusConflictBg],
      ['prov.user', TOKENS.provUser, TOKENS.provUserBg],
      ['prov.doc', TOKENS.provDoc, TOKENS.provDocBg],
      ['prov.ai', TOKENS.provAi, TOKENS.provAiBg],
      ['prov.verified', TOKENS.provVerified, TOKENS.provVerifiedBg],
      ['prov.conflict', TOKENS.provConflict, TOKENS.provConflictBg],
    ]
    const failures = pairs
      .map(([n, fg, bg]) => [n, ratio(fg, bg)] as const)
      .filter(([, r]) => r < 4.5)
      .map(([n, r]) => `${n}: ${r.toFixed(2)}:1`)
    expect(failures).toEqual([])
  })

  it('inverse text on the accent (primary button) clears WCAG AA', () => {
    expect(ratio(TOKENS.inverse, TOKENS.accent)).toBeGreaterThanOrEqual(4.5)
  })

  it('accent text on accentSoft clears WCAG AA', () => {
    expect(ratio(TOKENS.accent, TOKENS.accentSoft)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('status colours', () => {
  it('maps every RangeStatus to a status token, so a chart point and its pill agree', () => {
    expect(Object.values(STATUS_HEX).every((h) => /^#[0-9A-F]{6}$/i.test(h))).toBe(true)
    expect(STATUS_HEX.LOW).toBe(TOKENS.statusLow)
    expect(STATUS_HEX.WITHIN_RANGE).toBe(TOKENS.statusNormal)
    expect(STATUS_HEX.HIGH).toBe(TOKENS.statusHigh)
    // Both "we could not check it" states share the neutral token — neither is
    // an abnormal result and neither may be coloured as one.
    expect(STATUS_HEX.UNKNOWN).toBe(TOKENS.statusUnknown)
    expect(STATUS_HEX.UNEVALUABLE).toBe(TOKENS.statusUnknown)
  })
})
