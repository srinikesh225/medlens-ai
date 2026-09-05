import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  /** Numeric columns get tabular figures and right alignment by default. */
  numeric?: boolean
  align?: 'left' | 'right'
  /** Hide below the lg breakpoint — use for secondary columns on narrow screens. */
  hideOnSmall?: boolean
  render: (row: T) => ReactNode
}

/**
 * The one table in the system.
 *
 * Header sits on the `sunken` surface with the label type style; rows are
 * separated by 1px `border` hairlines only. Numeric columns use tabular
 * figures so lab values align down the column.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Accessible description of the table; visually hidden. */
  caption: string
  empty?: { title: string; hint?: string }
}) {
  if (rows.length === 0) {
    return <EmptyState title={empty?.title ?? 'Nothing to show yet'} hint={empty?.hint} />
  }

  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-sunken">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={[
                  'text-label px-3 py-3 whitespace-nowrap',
                  (col.align ?? (col.numeric ? 'right' : 'left')) === 'right' ? 'text-right' : 'text-left',
                  col.hideOnSmall ? 'hidden lg:table-cell' : '',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-border hover:bg-sunken">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    'px-3 py-4 align-middle',
                    col.numeric ? 'num whitespace-nowrap' : '',
                    (col.align ?? (col.numeric ? 'right' : 'left')) === 'right' ? 'text-right' : 'text-left',
                    col.hideOnSmall ? 'hidden lg:table-cell' : '',
                  ].join(' ')}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
