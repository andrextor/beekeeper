// Supabase Auth errors come in English; the panel shows Spanish by error_code (docs/api.md → Auth).
const messages: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  validation_failed: 'Revisa el correo y la contraseña.',
  over_request_rate_limit: 'Demasiados intentos. Espera un minuto.',
}

export const networkErrorMessage = 'No hay conexión. Revisa tu internet e inténtalo de nuevo.'
const fallbackMessage = 'No pudimos ingresar. Inténtalo de nuevo.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof TypeError) return networkErrorMessage
  if (!isRecord(error)) return fallbackMessage
  if (error.name === 'AuthRetryableFetchError') return networkErrorMessage
  if (error.status === 429) return messages.over_request_rate_limit ?? fallbackMessage
  const code = typeof error.code === 'string' ? error.code : undefined
  return (code && messages[code]) || fallbackMessage
}

const panelOrigin = 'http://panel.invalid'

/**
 * Only internal paths: "//evil.com" or "https://…" in ?next= would send the admin off-site after signing in.
 * Parsing catches what browsers normalize to "//", such as "/\\evil.com" or a tab in "/\t/evil.com".
 */
export function safeNextPath(next: string | null): string {
  const url = next?.startsWith('/') ? URL.parse(next, panelOrigin) : null
  return url?.origin === panelOrigin ? url.pathname + url.search + url.hash : '/'
}
