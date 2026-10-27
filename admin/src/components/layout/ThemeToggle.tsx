import { Monitor, Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { cx } from '../../lib/cx'
import {
  readThemePreference,
  setThemePreference,
  subscribeTheme,
  type ThemePreference,
} from '../../lib/theme'
import { buttonBase, buttonVariants } from '../ui/Button'

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
      className={cx(buttonBase, buttonVariants.ghost, 'size-11 md:size-9', className)}
    >
      <Icon size={18} aria-hidden />
    </button>
  )
}
