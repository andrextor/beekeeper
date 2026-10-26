import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Card } from './Card'
import { Skeleton } from './Skeleton'

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string }

/** A table from md up and stacked cards below (DESIGN.md → Layout). */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  card,
  loading = false,
  empty,
}: {
  caption: string
  columns: ReadonlyArray<Column<T>>
  rows: ReadonlyArray<T> | undefined
  rowKey: (row: T) => string
  card: (row: T) => ReactNode
  loading?: boolean
  empty: ReactNode
}) {
  if (loading && !rows) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-14" />
        ))}
      </div>
    )
  }
  if (!rows?.length) return <Card>{empty}</Card>

  return (
    <div className={cx('transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
      <ul className="stagger flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>{card(row)}</li>
        ))}
      </ul>
      <Card className="hidden overflow-x-auto p-0 md:block md:p-0">
        <table className="w-full text-left text-sm tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-glass-border text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cx('px-4 py-3 font-medium', column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-glass-border transition-colors last:border-0 hover:bg-glass-field"
              >
                {columns.map((column) => (
                  <td key={column.header} className={cx('px-4 py-3', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
