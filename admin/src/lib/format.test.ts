import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber, formatRelative } from './format'

const now = new Date('2026-10-26T15:00:00Z')

describe('formatRelative', () => {
  it('uses minutes, hours and days under a week', () => {
    expect(formatRelative('2026-10-26T14:55:00Z', now)).toBe('hace 5 minutos')
    expect(formatRelative('2026-10-26T12:00:00Z', now)).toBe('hace 3 horas')
    expect(formatRelative('2026-10-25T15:00:00Z', now)).toBe('ayer')
    expect(formatRelative('2026-10-21T15:00:00Z', now)).toBe('hace 5 días')
  })

  it('switches to the absolute date from seven days on', () => {
    expect(formatRelative('2026-10-19T15:00:00Z', now)).toBe(formatDate('2026-10-19T15:00:00Z'))
  })
})

describe('formatNumber', () => {
  it('groups thousands the Colombian way', () => {
    expect(formatNumber(1234567)).toBe('1.234.567')
  })
})
