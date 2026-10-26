import { type LucideIcon, SearchX } from 'lucide-react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

/** No rows: past the last page (old link), no match for the search, or nothing yet. */
export function ListEmpty({
  q,
  page,
  onFirstPage,
  icon,
  title,
}: {
  q: string
  page: number
  onFirstPage: () => void
  icon: LucideIcon
  title: string
}) {
  if (page > 1) {
    return (
      <EmptyState
        icon={SearchX}
        title="Esta página ya no existe"
        action={
          <Button variant="secondary" onClick={onFirstPage}>
            Ir a la primera página
          </Button>
        }
      />
    )
  }
  if (q)
    return <EmptyState icon={SearchX} title="Sin resultados" hint={`Nada coincide con “${q}”.`} />
  return <EmptyState icon={icon} title={title} />
}
