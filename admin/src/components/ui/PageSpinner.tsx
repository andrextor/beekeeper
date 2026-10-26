import { LoaderCircle } from 'lucide-react'

export function PageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <LoaderCircle size={32} className="animate-spin text-primary" aria-hidden />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
