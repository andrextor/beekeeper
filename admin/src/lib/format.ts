const locale = 'es-CO'
const dayMs = 86_400_000

const dateFormat = new Intl.DateTimeFormat(locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const dateTimeFormat = new Intl.DateTimeFormat(locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
const numberFormat = new Intl.NumberFormat(locale)

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/** "hace 3 horas", "ayer", "hace 5 días" under a week; the absolute date after that. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime()
  if (Math.abs(diffMs) >= 7 * dayMs) return formatDate(iso)
  const minutes = Math.round(diffMs / 60_000)
  if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, 'minute')
  const hours = Math.round(diffMs / 3_600_000)
  if (Math.abs(hours) < 24) return relativeFormat.format(hours, 'hour')
  return relativeFormat.format(Math.round(diffMs / dayMs), 'day')
}

export function formatLastInspection(iso: string | null): string {
  return iso ? `Última revisión ${formatRelative(iso)}` : 'Sin revisiones'
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}
