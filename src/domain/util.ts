/** Small shared utilities. Kept dependency-free and deterministic. */

let counter = 0
/** Stable-ish id generator. Deterministic within a session for demo replays. */
export function makeId(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${counter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/** Normalize a test/medication name for grouping (trend + conflict detection). */
export function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // drop parentheticals like "(HbA1c)"
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Format an ISO date as "05 Sep 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Format an ISO datetime as "05 Sep 2026, 14:32". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${formatDate(iso)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

/** Which page a character offset falls on, given page break offsets. */
export function pageForOffset(offset: number, pageBreaks: number[]): number {
  let page = 1
  for (let i = 0; i < pageBreaks.length; i++) {
    if (offset >= pageBreaks[i]) page = i + 1
  }
  return page
}

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
