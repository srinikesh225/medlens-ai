import { useEffect, useRef } from 'react'
import type { Report, SourceSpan } from '@/domain/types'

/**
 * Renders a report's ORIGINAL raw text with an optional highlighted span.
 * The highlight uses the real character offsets stored on each value's
 * provenance — this is what makes "click a value → see its source" honest.
 */
export function SourceDocument({
  report,
  activeSpan,
}: {
  report: Report
  activeSpan?: SourceSpan | null
}) {
  const markRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (activeSpan && markRef.current) {
      markRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeSpan])

  const text = report.rawText
  let before = text
  let hit = ''
  let after = ''
  if (activeSpan && activeSpan.reportId === report.id) {
    before = text.slice(0, activeSpan.start)
    hit = text.slice(activeSpan.start, activeSpan.end)
    after = text.slice(activeSpan.end)
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-ink-700">
      {hit ? (
        <>
          {before}
          <mark
            ref={markRef}
            className="rounded bg-amber-200/80 px-0.5 text-ink-900 ring-1 ring-amber-400 transition-colors"
          >
            {hit}
          </mark>
          {after}
        </>
      ) : (
        text
      )}
    </pre>
  )
}
