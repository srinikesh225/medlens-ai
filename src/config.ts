/**
 * Runtime configuration, read from Vite env vars.
 *
 * DEMO_MODE is the switch the checklist calls for: when true (the default), the
 * app makes ZERO network/API calls — extraction runs entirely in-browser with
 * the deterministic engine. Set VITE_DEMO_MODE=false AND provide a server-side
 * extraction endpoint to enable the live-LLM path (which never holds a key in
 * the browser — it calls a backend proxy).
 */

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false' // default: true

export const EXTRACTION_ENDPOINT = import.meta.env.VITE_EXTRACTION_ENDPOINT ?? ''

export const EXTRACTION_MODEL = import.meta.env.VITE_EXTRACTION_MODEL ?? 'claude-sonnet-5'

/** True only when a live LLM path is both enabled and configured. */
export const LIVE_EXTRACTION = !DEMO_MODE && EXTRACTION_ENDPOINT.length > 0
