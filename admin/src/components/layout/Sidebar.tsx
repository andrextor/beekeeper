import { Hexagon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cx } from '../../lib/cx'
import { navigation } from './navigation'
import { ThemeToggle } from './ThemeToggle'

/** Always on the brand's deep background (DESIGN.md → Layout), in light and dark. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-deep text-stone-100">
      <div className="flex items-center gap-2 px-6 py-6">
        <Hexagon size={24} className="text-honey" aria-hidden />
        <span className="font-display text-xl font-bold">Landak Apiario</span>
      </div>
      <nav aria-label="Principal" className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {navigation.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-11 items-center gap-3 rounded-control border-l-4 px-3 transition hover:bg-white/10',
                    isActive ? 'border-honey bg-white/10 font-medium' : 'border-transparent',
                  )
                }
              >
                <Icon size={20} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
        <span className="text-sm text-stone-300">Administrador</span>
        <ThemeToggle className="hover:bg-white/10" />
      </div>
    </div>
  )
}
