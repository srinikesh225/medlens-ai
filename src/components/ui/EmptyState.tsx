import type { ReactNode } from 'react'

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string
  hint?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="text-center px-6 py-12">
      {icon && (
        <div className="flex justify-center mb-4 text-faint" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-body font-medium text-ink">{title}</p>
      {hint && <p className="text-body text-secondary mt-2">{hint}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
