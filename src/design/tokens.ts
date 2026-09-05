/**
 * MedLens design tokens — the single source of truth.
 *
 * These hex values are mirrored as CSS custom properties in `src/index.css`
 * (as space-separated RGB channels, so Tailwind's `/opacity` modifiers keep
 * working) and surfaced as Tailwind theme keys in `tailwind.config.ts`.
 *
 * `src/design/tokens.test.ts` asserts the three stay in sync — if you add a
 * token here and forget the CSS variable, the test suite fails.
 *
 * Import from this module ONLY where a real colour value is unavoidable:
 * SVG `fill` / `stroke` attributes. Everything else must use the Tailwind
 * token classes.
 */

export const TOKENS = {
  /* ---------------------------------------------------------------- surface */
  canvas: '#F6F7F9', // page background
  card: '#FFFFFF',
  sunken: '#F0F2F5', // table headers, inset panels
  border: '#E6E9ED', // hairlines only, 1px

  /* ------------------------------------------------------------------- text */
  // Named `ink` rather than `primary`: `text-primary` would be ambiguous with
  // the accent/brand colour. `text-ink` is the primary text token.
  ink: '#12161C',
  secondary: '#5B6472',
  // SPEC DEVIATION (accessibility): the specified #8A93A1 measures 2.77:1 on
  // `sunken` and 3.10:1 on `card` — below the required 4.5:1. Darkened to the
  // lightest value that clears 4.5:1 on all three surfaces (worst case 4.66:1).
  muted: '#646D7B',
  // The original #8A93A1, retained for NON-TEXT use only: icon strokes,
  // chart gridlines, decorative glyphs. Never apply this to text.
  faint: '#8A93A1',
  inverse: '#FFFFFF',

  /* ----------------------------------------------------------------- accent */
  // ONLY for primary buttons, active nav, focus rings, and the wordmark dot.
  accent: '#1B5FE0',
  accentSoft: '#EAF0FE',

  /* ----------------------------------------------------- status (semantic) */
  // Never decorative. Always paired with an icon and a text label.
  statusLow: '#B4530A',
  statusLowBg: '#FDF2E7',
  statusNormal: '#14724B',
  statusNormalBg: '#E9F5EF',
  statusHigh: '#B42318',
  statusHighBg: '#FEECEA',
  statusUnknown: '#5B6472',
  statusUnknownBg: '#F0F2F5',
  statusConflict: '#8B4A9C',
  statusConflictBg: '#F6EDF8',

  /* ------------------------------------------------------ provenance badges */
  provUser: '#14724B',
  provUserBg: '#E9F5EF',
  provDoc: '#1B5FE0',
  provDocBg: '#EAF0FE',
  provAi: '#8B4A9C',
  provAiBg: '#F6EDF8',
  provVerified: '#0F766E',
  provVerifiedBg: '#E6F4F3',
  provConflict: '#B42318',
  provConflictBg: '#FEECEA',
} as const

export type TokenName = keyof typeof TOKENS

/** `--token-name` kebab-cased, matching the CSS custom properties. */
export function cssVarName(name: TokenName): string {
  return '--' + name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
}

/** "#1B5FE0" -> "27 95 224" (the channel form stored in the CSS variables). */
export function toChannels(hex: string): string {
  const s = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)).join(' ')
}

/* -------------------------------------------------------------------------- */
/* Status → token mapping, shared by the badge primitives and the SVG charts   */
/* so a status can never be drawn in one colour and labelled in another.       */
/* -------------------------------------------------------------------------- */
import type { RangeStatus } from '@/domain/types'

export const STATUS_HEX: Record<RangeStatus, string> = {
  LOW: TOKENS.statusLow,
  WITHIN_RANGE: TOKENS.statusNormal,
  HIGH: TOKENS.statusHigh,
  UNKNOWN: TOKENS.statusUnknown,
  UNEVALUABLE: TOKENS.statusUnknown,
}
