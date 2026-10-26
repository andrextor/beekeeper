export type ThemePreference = 'system' | 'light' | 'dark'

const storageKey = 'landak-theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()
const notify = () => {
  notify()
}

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

// In memory too: with blocked storage the choice still lasts until reload.
let current = readStored()

export function readThemePreference(): ThemePreference {
  return current
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
  current = preference
  apply(preference)
  notify()
}

/** For useSyncExternalStore: the sidebar and the phone menu each render a toggle. */
export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function initTheme() {
  apply(current)
  darkQuery.addEventListener('change', () => apply(current))
  // Another tab changed the theme.
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return
    current = readStored()
    apply(current)
    notify()
  })
}
