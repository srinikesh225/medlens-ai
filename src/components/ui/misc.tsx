import { useEffect, type ReactNode } from 'react'
import { X, Info } from 'lucide-react'
import { TOKENS } from '@/design/tokens'
import { SectionHeader } from './Card'
import { Button } from './Button'

/** The wordmark. The dot is one of the four sanctioned uses of the accent. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill={TOKENS.ink} />
      <path
        d="M9 21V11l7 5 7-5v10"
        fill="none"
        stroke={TOKENS.inverse}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2.4" fill={TOKENS.accent} />
    </svg>
  )
}

/**
 * DEPRECATED — a thin adapter over the `SectionHeader` primitive, kept so the
 * screens not yet migrated keep compiling. New code imports SectionHeader.
 */
export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return <SectionHeader title={title} description={subtitle} action={right} className="mb-4" />
}

export { EmptyState } from './EmptyState'

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-up" onClick={onClose} />
      <div
        className={`relative bg-card rounded-card border border-border shadow-raised w-full ${
          wide ? 'max-w-5xl' : 'max-w-lg'
        } max-h-full flex flex-col animate-fade-up`}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
          <h3 className="text-h2 text-ink">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </Button>
        </div>
        <div className="overflow-y-auto scroll-thin p-6">{children}</div>
      </div>
    </div>
  )
}

/**
 * The standing safety notice. Deliberately quiet but always present — it is a
 * statement of scope, not an alert, so it never uses the status palette.
 */
export function DisclaimerBar({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-sunken px-4 py-3 text-sm text-secondary">
      <Info size={16} className="mt-1 shrink-0 text-muted" aria-hidden />
      <span>{text}</span>
    </div>
  )
}
