import { Hexagon, LogOut } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { cx } from '../../lib/cx'
import { signOut, useSession } from '../../lib/session'
import { navigation } from './navigation'
import { ThemeToggle } from './ThemeToggle'

/** Glass panel over the page's glow (DESIGN.md → Layout). */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const email = useSession().session?.user.email

  return (
    <div className="glass flex h-full flex-col rounded-none border-y-0 border-l-0 text-text">
      <div className="flex items-center gap-2 px-6 py-6">
        <Hexagon
          size={24}
          className="text-primary transition-transform duration-500 ease-out hover:rotate-180"
          aria-hidden
        />
        <span className="font-display text-xl font-bold">Landak Apiario</span>
      </div>
      <nav aria-label="Principal" className="flex-1 px-3">
        <ul className="stagger flex flex-col gap-1">
          {navigation.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                viewTransition
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    'group flex min-h-11 items-center gap-3 rounded-control border-l-4 px-3 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-glass-field',
                    isActive
                      ? 'border-accent bg-accent/15 font-medium'
                      : 'border-transparent text-muted',
                  )
                }
              >
                <Icon
                  size={20}
                  className="transition-transform duration-200 group-hover:scale-110"
                  aria-hidden
                />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-2 border-t border-glass-border px-3 py-4">
        <Link
          to="/mi-cuenta"
          viewTransition
          onClick={onNavigate}
          className="truncate px-3 text-sm text-muted hover:text-text hover:underline"
          title={`${email ?? ''} · Mi cuenta`}
        >
          {email}
        </Link>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => signOut()}
            className="group flex min-h-11 items-center gap-3 rounded-control px-3 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-glass-field"
          >
            <LogOut
              size={20}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
            Cerrar sesión
          </button>
          <ThemeToggle className="hover:bg-glass-field" />
        </div>
      </div>
    </div>
  )
}
