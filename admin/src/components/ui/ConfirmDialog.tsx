import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

/** Asks before a change of access. */
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
  return (
    <Dialog
      open={open}
      title={title}
      busy={pending}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children && <div className="text-sm text-muted">{children}</div>}
      {error && (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  )
}
