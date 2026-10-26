export type ThemePreference = 'system' | 'light' | 'dark'

const storageKey = 'landak-theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function apply(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && darkQuery.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(storageKey, preference)
  } catch {
    // Private mode or blocked storage: the choice lasts until reload.
  }
  apply(preference)
  for (const listener of listeners) listener()
}

/** For useSyncExternalStore: the sidebar and the phone menu each render a toggle. */
export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function initTheme() {
  apply(readThemePreference())
  darkQuery.addEventListener('change', () => apply(readThemePreference()))
}
