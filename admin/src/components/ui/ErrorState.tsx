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
      <TriangleAlert size={48} className="animate-pop text-danger" aria-hidden />
      <p className="max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
