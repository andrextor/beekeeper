import { TriangleAlert } from 'lucide-react'
import { Button } from './Button'

export function ErrorState({
  message = 'No pudimos cargar los datos.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <TriangleAlert size={22} aria-hidden />
      </span>
      <p className="max-w-sm text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
