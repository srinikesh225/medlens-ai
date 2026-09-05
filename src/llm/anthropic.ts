/**
 * Real-LLM extractor adapter (pluggable).
 *
 * HONESTY NOTE: API keys must NEVER live in a browser bundle. This adapter is
 * therefore written to call a *backend* extraction endpoint (which holds the
 * key server-side) — the production topology documented in the README. In the
 * offline prototype the deterministic extractor is the default; enabling the
 * live adapter without a backend throws a clear, non-crashing error that the UI
 * turns into "AI unavailable — using deterministic extractor / manual entry".
 *
 * The prompt below is the exact contract we would send a model: the responsible-
 * AI system rules + the JSON output schema + the report text. The response is
 * still routed through validateExtraction() — the model never writes to the
 * record directly.
 */

import type { Extractor } from './extractor'
import { EXTRACTION_JSON_SCHEMA, validateExtraction, type ExtractionOutput } from './schema'
import { EXTRACTION_SYSTEM_CONTRACT } from '@/domain/safety'

export interface LiveExtractorConfig {
  /** Backend endpoint that proxies to the model with a server-side key. */
  endpoint: string
  model?: string
}

export function buildExtractionMessages(reportText: string, model = 'claude-sonnet-5') {
  return {
    model,
    system: EXTRACTION_SYSTEM_CONTRACT,
    // The output contract is explicit; we validate the response regardless.
    schema: EXTRACTION_JSON_SCHEMA,
    messages: [
      {
        role: 'user' as const,
        content:
          'Extract laboratory results and medications from the report below into JSON ' +
          'matching the provided schema. Copy values, units, dates and reference ranges ' +
          'VERBATIM. If a reference range is absent, omit it — do not invent one.\n\n' +
          '=== REPORT TEXT ===\n' +
          reportText,
      },
    ],
  }
}

export function makeLiveExtractor(config: LiveExtractorConfig): Extractor {
  return {
    id: 'medlens-live-extractor',
    label: `Live LLM extractor (${config.model ?? 'claude-sonnet-5'})`,
    async extract(text: string): Promise<ExtractionOutput> {
      if (!config.endpoint) {
        throw new Error(
          'Live extraction requires a backend endpoint (server-side API key). ' +
            'None configured — falling back to the deterministic extractor.',
        )
      }
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildExtractionMessages(text, config.model)),
      })
      if (!res.ok) throw new Error(`Extraction endpoint returned ${res.status}`)
      const raw = (await res.json()) as unknown
      const validated = validateExtraction(raw)
      if (!validated.ok || !validated.value) {
        throw new Error('LLM output failed schema validation: ' + validated.errors.join('; '))
      }
      return validated.value
    },
  }
}
