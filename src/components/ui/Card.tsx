import type { ReactNode } from 'react'

/**
 * The only card surface in the system.
 *
 * `tone="primary"` is for the one card that leads a screen — it gets 32px of
 * padding and the raised shadow. Everything else uses the default 24px card.
 */
export function Card({
  children,
  tone = 'default',
  className = '',
  as: Tag = 'section',
  padded = true,
}: {
  children: ReactNode
  tone?: 'default' | 'primary'
  className?: string
  as?: 'section' | 'div' | 'article' | 'aside'
  /** Set false when the card owns a full-bleed child such as a DataTable. */
  padded?: boolean
}) {
  const pad = padded ? (tone === 'primary' ? 'p-8' : 'p-6') : ''
  const shadow = tone === 'primary' ? 'shadow-raised' : 'shadow-card'
  return (
    <Tag className={`bg-card rounded-card border border-border ${shadow} ${pad} ${className}`}>
      {children}
    </Tag>
  )
}

/**
 * The heading block that opens a card or a page section.
 * `eyebrow` renders the label type style above the title.
 */
export function SectionHeader({
  title,
  description,
  action,
  eyebrow,
  level = 2,
  className = '',
}: {
  title: string
  description?: string
  action?: ReactNode
  eyebrow?: string
  level?: 1 | 2
  className?: string
}) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-label mb-2">{eyebrow}</p>}
        <Heading className={level === 1 ? 'text-h1 text-ink' : 'text-h2 text-ink'}>{title}</Heading>
        {description && <p className="text-body text-secondary mt-2">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
