import { Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { readThemePreference, setThemePreference, type ThemePreference } from '../../lib/theme'

const next: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }
const labels: Record<ThemePreference, string> = {
  system: 'Tema del sistema',
  light: 'Tema claro',
  dark: 'Tema oscuro',
}
const icons = { system: Monitor, light: Sun, dark: Moon }

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [preference, setPreference] = useState(readThemePreference)
  const Icon = icons[preference]

  return (
    <button
      type="button"
      onClick={() => {
        const value = next[preference]
        setThemePreference(value)
        setPreference(value)
      }}
      aria-label={`${labels[preference]}. Cambiar tema`}
      title={labels[preference]}
      className={`inline-flex size-11 items-center justify-center rounded-control ${className}`}
    >
      <Icon size={20} aria-hidden />
    </button>
  )
}
