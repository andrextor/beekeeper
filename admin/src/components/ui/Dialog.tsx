import { X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'
import { IconButton } from './IconButton'

/** A modal panel on a native dialog: focus trap and Esc for free. `busy` keeps it open while a change runs. */
export function Dialog({
  open,
  title,
  busy = false,
  onClose,
  footer,
  children,
}: {
  open: boolean
  title: string
  busy?: boolean
  onClose: () => void
  footer?: ReactNode
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
      // A close the parent asked for (open=false) already happened in its state; only Esc or X reach onClose.
      onClose={() => {
        if (open) onClose()
      }}
      onCancel={(event) => {
        // Esc while the change runs would hide its result.
        if (busy) event.preventDefault()
      }}
      aria-label={title}
      className="m-auto w-[min(100vw-2rem,30rem)] rounded-card border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <h2 className="pt-1 text-lg font-semibold">{title}</h2>
        <IconButton
          icon={X}
          label="Cerrar"
          disabled={busy}
          onClick={() => dialog.current?.close()}
          className="-mr-2"
        />
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">{children}</div>
      {footer && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted-surface/50 px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  )
}
