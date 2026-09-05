import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#1d494f" />
      <path d="M9 21V11l7 5 7-5v10" fill="none" stroke="#75c4c8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="2.4" fill="#aadddf" />
    </svg>
  )
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="text-center py-10 px-6">
      {icon && <div className="flex justify-center mb-3 text-ink-300">{icon}</div>}
      <p className="font-medium text-ink-700">{title}</p>
      {hint && <p className="text-sm text-ink-500 mt-1">{hint}</p>}
    </div>
  )
}

export function Stat({
  label,
  value,
  tone = 'neutral',
  icon,
  hint,
}: {
  label: string
  value: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'primary'
  icon?: ReactNode
  hint?: string
}) {
  const tones = {
    neutral: 'text-ink-900',
    good: 'text-emerald-700',
    warn: 'text-amber-700',
    danger: 'text-rose-700',
    primary: 'text-primary-700',
  }
  const chip = {
    neutral: 'bg-ink-100 text-ink-500',
    good: 'bg-emerald-50 text-emerald-600',
    warn: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-600',
    primary: 'bg-primary-50 text-primary-600',
  }
  return (
    <div className="card p-4 transition-shadow hover:shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <span className="label mt-1">{label}</span>
        {icon && <span className={`icon-chip ${chip[tone]}`}>{icon}</span>}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </div>
  )
}

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
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-up" onClick={onClose} />
      <div className={`relative card shadow-panel w-full ${wide ? 'max-w-5xl' : 'max-w-lg'} max-h-[90vh] flex flex-col animate-fade-up`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100">
          <h3 className="font-semibold text-ink-900">{title}</h3>
          <button className="btn-ghost p-1.5 -mr-1.5" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto scroll-thin p-5">{children}</div>
      </div>
    </div>
  )
}

export function DisclaimerBar({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-[13px] leading-snug text-primary-900">
      <span className="mt-0.5 shrink-0 text-primary-600" aria-hidden>ⓘ</span>
      <span>{text}</span>
    </div>
  )
}
