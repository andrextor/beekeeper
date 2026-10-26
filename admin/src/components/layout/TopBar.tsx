import { Hexagon, Menu, X } from 'lucide-react'
import { useRef } from 'react'
import { IconButton } from '../ui/IconButton'
import { Sidebar } from './Sidebar'

/** Below lg: a top bar whose menu opens the sidebar in a native modal dialog (focus trap and Esc for free). */
export function TopBar() {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-2 lg:hidden">
      <IconButton icon={Menu} label="Abrir menú" onClick={() => dialog.current?.showModal()} />
      <Hexagon size={20} className="text-primary" aria-hidden />
      <span className="font-display text-lg font-bold">Landak Apiario</span>
      <dialog
        ref={dialog}
        aria-label="Menú"
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] p-0 backdrop:bg-black/40"
      >
        <div className="relative h-full">
          <IconButton
            icon={X}
            label="Cerrar menú"
            onClick={close}
            className="absolute top-4 right-2 text-stone-100 hover:bg-white/10"
          />
          <Sidebar onNavigate={close} />
        </div>
      </dialog>
    </header>
  )
}
