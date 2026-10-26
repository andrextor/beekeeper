import { describe, expect, it } from 'vitest'
import { formatAltitude, formatColonyAge, formatDate, formatNumber, formatRelative } from './format'

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

describe('formatColonyAge', () => {
  const today = new Date(2026, 9, 26)

  it('counts whole months and years', () => {
    expect(formatColonyAge('2026-10-10', today)).toBe('Menos de un mes')
    expect(formatColonyAge('2026-09-26', today)).toBe('1 mes')
    expect(formatColonyAge('2026-07-27', today)).toBe('2 meses')
    expect(formatColonyAge('2025-10-26', today)).toBe('1 año')
    expect(formatColonyAge('2025-03-14', today)).toBe('1 año y 7 meses')
    expect(formatColonyAge('2027-01-01', today)).toBe('Menos de un mes')
  })
})

describe('formatAltitude', () => {
  it('groups thousands in meters', () => {
    expect(formatAltitude(2550)).toBe('2.550 m')
  })
})
