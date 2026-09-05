/**
 * The provenance / status / verification badge system.
 *
 * ACCESSIBILITY: every badge carries an icon + text label, never colour alone.
 * This satisfies the rule "do not rely solely on red/green to communicate
 * medical-data status" and keeps the meaning legible to colour-blind users.
 */
import {
  User,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  HelpCircle,
  MinusCircle,
  type LucideIcon,
} from 'lucide-react'
import type { RangeStatus, SourceType, VerificationState } from '@/domain/types'

interface BadgeSpec {
  label: string
  icon: LucideIcon
  className: string
  dot: string
}

const PROVENANCE: Record<SourceType, BadgeSpec> = {
  USER_PROVIDED: { label: 'User provided', icon: User, className: 'bg-cyan-50 text-cyan-800 border-cyan-200', dot: 'bg-cyan-500' },
  DOCUMENT_EXTRACTED: { label: 'Document extracted', icon: FileText, className: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-600' },
  AI_GENERATED: { label: 'AI generated', icon: Sparkles, className: 'bg-violet-50 text-violet-800 border-violet-200', dot: 'bg-violet-600' },
  HUMAN_VERIFIED: { label: 'Human verified', icon: ShieldCheck, className: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  CONFLICT: { label: 'Conflict detected', icon: AlertTriangle, className: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-600' },
}

export function ProvenanceBadge({ type, className = '' }: { type: SourceType; className?: string }) {
  const s = PROVENANCE[type]
  const Icon = s.icon
  return (
    <span
      className={`chip border ${s.className} ${className}`}
      title={`Source: ${s.label}`}
    >
      <Icon size={12} strokeWidth={2.4} aria-hidden />
      {s.label}
    </span>
  )
}

const STATUS: Record<RangeStatus, BadgeSpec> = {
  LOW: { label: 'Low', icon: ArrowDown, className: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-600' },
  WITHIN_RANGE: { label: 'Within reported range', icon: Check, className: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600' },
  HIGH: { label: 'High', icon: ArrowUp, className: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-600' },
  UNKNOWN: { label: 'Range unavailable', icon: HelpCircle, className: 'bg-stone-100 text-stone-700 border-stone-300', dot: 'bg-stone-500' },
  UNEVALUABLE: { label: 'Not evaluable', icon: MinusCircle, className: 'bg-stone-100 text-stone-600 border-stone-300', dot: 'bg-stone-400' },
}

export function StatusPill({ status, compact = false }: { status: RangeStatus; compact?: boolean }) {
  const s = STATUS[status]
  const Icon = s.icon
  return (
    <span className={`chip border ${s.className}`} title={s.label}>
      <Icon size={12} strokeWidth={2.6} aria-hidden />
      {!compact && s.label}
      {compact && <span className="sr-only">{s.label}</span>}
    </span>
  )
}

const VERIFICATION: Record<VerificationState, { label: string; className: string }> = {
  UNREVIEWED: { label: 'Unreviewed', className: 'bg-ink-100 text-ink-600 border-ink-200' },
  VERIFIED: { label: 'Verified', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  EDITED: { label: 'Edited & verified', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  REJECTED: { label: 'Rejected', className: 'bg-ink-100 text-ink-500 border-ink-200 line-through' },
}

export function VerificationPill({ state }: { state: VerificationState }) {
  const s = VERIFICATION[state]
  return <span className={`chip border ${s.className}`}>{s.label}</span>
}

export function Chip({
  children,
  className = '',
  tone = 'neutral',
}: {
  children: React.ReactNode
  className?: string
  tone?: 'neutral' | 'primary' | 'warn' | 'danger'
}) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700 border-ink-200',
    primary: 'bg-primary-50 text-primary-800 border-primary-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
  }
  return <span className={`chip border ${tones[tone]} ${className}`}>{children}</span>
}
