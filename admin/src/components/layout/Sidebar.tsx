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
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-control bg-primary text-on-primary">
          <Hexagon size={18} aria-hidden />
        </span>
        <span className="font-display text-lg font-bold">Landak Apiario</span>
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
                    'flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-150 lg:min-h-9',
                    isActive
                      ? 'bg-surface text-text shadow-xs ring-1 ring-border'
                      : 'text-muted hover:bg-muted-surface hover:text-text',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={isActive ? 'text-primary' : undefined} aria-hidden />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-2 border-t border-border px-3 py-4">
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
            className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium text-muted transition-colors hover:bg-muted-surface hover:text-text lg:min-h-9"
          >
            <LogOut size={18} aria-hidden />
            Cerrar sesión
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
