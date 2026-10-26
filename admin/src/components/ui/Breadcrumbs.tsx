import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

/** Every item but the last links back; the last is the current page. */
export function Breadcrumbs({ items }: { items: ReadonlyArray<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Ruta" className="print:hidden">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {items.map((item, index) => (
          <li key={item.to ?? item.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={16} aria-hidden />}
            {item.to ? (
              <Link to={item.to} viewTransition className="hover:text-text hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-text">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
