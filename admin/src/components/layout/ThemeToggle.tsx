import { Monitor, Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import {
  readThemePreference,
  setThemePreference,
  subscribeTheme,
  type ThemePreference,
} from '../../lib/theme'

const next: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}
const labels: Record<ThemePreference, string> = {
  system: 'Tema del sistema',
  light: 'Tema claro',
  dark: 'Tema oscuro',
}
const icons = { system: Monitor, light: Sun, dark: Moon }

export function ThemeToggle({ className = '' }: { className?: string }) {
  const preference = useSyncExternalStore(subscribeTheme, readThemePreference)
  const Icon = icons[preference]

  return (
    <button
      type="button"
      onClick={() => setThemePreference(next[preference])}
      aria-label={`${labels[preference]}. Cambiar tema`}
      title={labels[preference]}
      className={`inline-flex size-11 items-center justify-center rounded-control transition duration-200 ease-out hover:scale-110 active:scale-90 ${className}`}
    >
      <Icon key={preference} size={20} className="animate-pop" aria-hidden />
    </button>
  )
}
