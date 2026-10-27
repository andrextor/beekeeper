import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { cx } from '../../lib/cx'
import { Card, cardClass } from './Card'
import { Skeleton } from './Skeleton'

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string }

/** A row below md: a solid card, linked with a chevron when it opens a detail page. */
export function MobileCard({ to, children }: { to?: string; children: ReactNode }) {
  const body = <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
  if (!to) return <div className={cx(cardClass, 'flex p-4')}>{body}</div>
  return (
    <Link
      to={to}
      viewTransition
      className={cx(
        cardClass,
        'flex items-center gap-3 p-4 transition-colors hover:bg-muted-surface',
      )}
    >
      {body}
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
    </Link>
  )
}

/** A table from md up and stacked cards below (DESIGN.md → Layout); `loading` dims the previous rows while a new page loads. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  card,
  rowHref,
  loading = false,
  empty,
}: {
  caption: string
  columns: ReadonlyArray<Column<T>>
  rows: ReadonlyArray<T> | undefined
  rowKey: (row: T) => string
  card: (row: T) => ReactNode
  /** Row click target; keep a link in a cell too, for the keyboard. */
  rowHref?: (row: T) => string
  loading?: boolean
  empty: ReactNode
}) {
  const navigate = useNavigate()

  if (!rows) {
    return (
      <div className={cx(cardClass, 'flex flex-col divide-y divide-border')} aria-busy>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex h-12 items-center px-4">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    )
  }
  if (!rows?.length) return <Card>{empty}</Card>

  return (
    <div className={cx('transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
      <ul className="stagger flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>{card(row)}</li>
        ))}
      </ul>
      <div className={cx(cardClass, 'hidden overflow-x-auto md:block')}>
        <table className="w-full text-left text-sm tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-muted-surface text-xs text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cx('h-10 px-4 font-medium whitespace-nowrap', column.className)}
                >
                  {column.header}
                </th>
              ))}
              {rowHref && <th aria-hidden className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={
                  rowHref
                    ? (event) => {
                        // A link inside the row already navigates; a second push would double the history entry.
                        if (event.target instanceof Element && event.target.closest('a')) return
                        navigate(rowHref(row), { viewTransition: true })
                      }
                    : undefined
                }
                className={cx(
                  'group transition-colors hover:bg-muted-surface/60',
                  rowHref && 'cursor-pointer',
                )}
              >
                {columns.map((column) => (
                  <td key={column.header} className={cx('h-12 px-4 py-2', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
                {rowHref && (
                  <td aria-hidden className="w-10 pr-3 text-muted">
                    <ChevronRight size={16} className="transition-colors group-hover:text-text" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
