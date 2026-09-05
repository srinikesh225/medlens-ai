import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Crumb } from '@/seo/siteConfig'

/**
 * Visible breadcrumb trail. The machine-readable BreadcrumbList JSON-LD is
 * emitted separately by usePageMeta, so this is purely the on-screen affordance.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center flex-wrap gap-1 text-sm text-ink-500">
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={c.path}>
              <li>
                {last ? (
                  <span aria-current="page" className="font-medium text-ink-700">{c.name}</span>
                ) : (
                  <Link to={c.path} className="hover:text-ink-800 hover:underline">{c.name}</Link>
                )}
              </li>
              {!last && <ChevronRight size={14} className="text-ink-300" aria-hidden />}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
