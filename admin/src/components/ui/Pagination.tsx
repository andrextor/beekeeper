import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageSize as defaultPageSize, pageCount } from '../../lib/admin-api'
import { formatNumber } from '../../lib/format'
import { Button } from './Button'

export function Pagination({
  page,
  total,
  pageSize = defaultPageSize,
  onChange,
}: {
  page: number
  total: number
  pageSize?: number
  onChange: (page: number) => void
}) {
  const pages = pageCount(total, pageSize)
  if (pages <= 1) return null
  const first = Math.min((page - 1) * pageSize + 1, total)
  const last = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Páginas"
      className="flex flex-wrap items-center justify-between gap-3 print:hidden"
    >
      <p className="text-sm text-muted tabular-nums">
        {formatNumber(first)}–{formatNumber(last)} de {formatNumber(total)}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} aria-hidden />
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
          <ChevronRight size={16} aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
