import { Hexagon, Menu, X } from 'lucide-react'
import { useRef } from 'react'
import { IconButton } from '../ui/IconButton'
import { Sidebar } from './Sidebar'

/** Below lg: a top bar whose menu opens the sidebar in a native modal dialog (focus trap and Esc for free). */
export function TopBar() {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = () => dialog.current?.close()

  return (
    <header className="glass sticky top-0 z-10 flex items-center gap-2 rounded-none border-x-0 border-t-0 px-2 lg:hidden">
      <IconButton icon={Menu} label="Abrir menú" onClick={() => dialog.current?.showModal()} />
      <Hexagon size={20} className="text-primary" aria-hidden />
      <span className="font-display text-lg font-bold">Landak Apiario</span>
      <dialog
        ref={dialog}
        aria-label="Menú"
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] bg-transparent p-0 backdrop:bg-black/30 backdrop:backdrop-blur-sm"
      >
        <div className="relative h-full">
          <IconButton
            icon={X}
            label="Cerrar menú"
            onClick={close}
            className="absolute top-4 right-2"
          />
          <Sidebar onNavigate={close} />
        </div>
      </dialog>
    </header>
  )
}
