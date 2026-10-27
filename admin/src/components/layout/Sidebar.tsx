import { BookOpen, ExternalLink, Hexagon, LogOut } from 'lucide-react'
import { NavLink } from 'react-router'
import { cx } from '../../lib/cx'
import { signOut, useSession } from '../../lib/session'
import { IconButton } from '../ui/IconButton'
import { manualUrl, navigation } from './navigation'
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
      <div className="px-3 pb-3">
        <a
          href={manualUrl}
          target="_blank"
          rel="noreferrer"
          className="group flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium text-muted transition-colors hover:bg-muted-surface hover:text-text lg:min-h-9"
        >
          <BookOpen size={18} aria-hidden />
          Manual de uso
          <ExternalLink size={14} className="ml-auto opacity-60" aria-hidden />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
      </div>
      <div className="flex items-center gap-1 border-t border-border p-3">
        <NavLink
          to="/mi-cuenta"
          viewTransition
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-control px-2 py-1.5 transition-colors',
              isActive ? 'bg-surface shadow-xs ring-1 ring-border' : 'hover:bg-muted-surface',
            )
          }
        >
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary uppercase"
          >
            {email?.charAt(0) ?? '?'}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">Mi cuenta</span>
            <span className="truncate text-xs text-muted">{email}</span>
          </span>
        </NavLink>
        <ThemeToggle />
        <IconButton icon={LogOut} label="Cerrar sesión" onClick={() => signOut()} />
      </div>
    </div>
  )
}
