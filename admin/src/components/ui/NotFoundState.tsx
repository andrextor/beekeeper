import { ChevronLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from './Card'
import { EmptyState } from './EmptyState'

export function NotFoundState({
  title,
  backTo,
  backLabel,
}: {
  title: string
  backTo: string
  backLabel: string
}) {
  return (
    <Card>
      <EmptyState
        icon={SearchX}
        title={title}
        hint="Puede que lo hayan eliminado o que el enlace esté incompleto."
        action={
          <Link
            to={backTo}
            viewTransition
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeft size={16} aria-hidden /> {backLabel}
          </Link>
        }
      />
    </Card>
  )
}
