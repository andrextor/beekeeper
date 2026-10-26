import { describe, expect, it, vi } from 'vitest'
import { isNotPlatformAdmin, pageCount, parseMemberships, parseStats } from './admin-api'

vi.mock('./supabase', () => ({ supabase: {} }))

const stats = {
  organizations: 2,
  users: 4,
  reviewers: 1,
  apiaries: 3,
  hives_active: 5,
  hives_total: 6,
  inspections_30d: 3,
  events_30d: 4,
  photos: 0,
  storage_bytes: 0,
}

describe('parseStats', () => {
  it('accepts the admin_stats object', () => {
    expect(parseStats(stats)).toEqual(stats)
  })

  it('refuses a missing or non-numeric count', () => {
    expect(() => parseStats({ ...stats, photos: '0' })).toThrow()
    expect(() => parseStats(null)).toThrow()
  })
})

describe('parseMemberships', () => {
  it('accepts live and deleted memberships', () => {
    const rows = [
      { id: 'a', name: 'Finca Landak', role: 'owner', deleted_at: null },
      { id: 'b', name: 'Cerrada', role: 'reviewer', deleted_at: '2026-10-28T00:00:00Z' },
    ]
    expect(parseMemberships(rows)).toEqual(rows)
  })

  it('refuses an unknown role', () => {
    expect(() =>
      parseMemberships([{ id: 'a', name: 'X', role: 'admin', deleted_at: null }]),
    ).toThrow()
  })
})

describe('pageCount', () => {
  it('rounds up and never returns zero', () => {
    expect(pageCount(0)).toBe(1)
    expect(pageCount(25)).toBe(1)
    expect(pageCount(26)).toBe(2)
  })
})

describe('isNotPlatformAdmin', () => {
  it('recognizes the RPC refusal only', () => {
    expect(isNotPlatformAdmin({ code: 'P0001', details: 'not_platform_admin' })).toBe(true)
    expect(isNotPlatformAdmin(new Error('network'))).toBe(false)
  })
})
