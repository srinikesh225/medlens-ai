export interface TabItem {
  id: string
  label: string
  /** Optional count badge, e.g. how many values a filter would show. */
  count?: number
}

/**
 * Segmented tab control. The active tab is the only place accent appears here;
 * inactive tabs stay neutral so the selection is unambiguous.
 */
export function TabNav({
  items,
  value,
  onChange,
  label,
  className = '',
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  /** Accessible name for the tab group. */
  label: string
  className?: string
}) {
  return (
    <div role="tablist" aria-label={label} className={`inline-flex items-center gap-1 rounded-md bg-sunken p-1 ${className}`}>
      {items.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={[
              'inline-flex items-center gap-2 rounded-sm px-3 py-1 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              active ? 'bg-card text-ink shadow-card' : 'text-secondary hover:text-ink',
            ].join(' ')}
          >
            {t.label}
            {t.count != null && (
              <span className="num text-xs text-muted">{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
