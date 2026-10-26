import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './IconButton'

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null

  return (
    <nav aria-label="Páginas" className="flex items-center justify-end gap-2">
      <IconButton
        icon={ChevronLeft}
        label="Página anterior"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      />
      <span className="text-sm text-muted tabular-nums">
        Página {page} de {pageCount}
      </span>
      <IconButton
        icon={ChevronRight}
        label="Página siguiente"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      />
    </nav>
  )
}
