import { type ReactNode, useEffect, useRef } from 'react'
import { Button } from './Button'

/** Asks before a change of access. A native dialog gives the focus trap and Esc. */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  confirmLabel: string
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      onClose={onCancel}
      aria-label={title}
      className="glass m-auto w-[min(100vw-2rem,28rem)] rounded-card p-6 text-text backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {children}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => dialog.current?.close()} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
