import { describe, expect, it, vi } from 'vitest'
import {
  isNotPlatformAdmin,
  pageCount,
  parseMemberships,
  parseOrganizationSummary,
  parseStats,
} from './admin-api'

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

describe('parseOrganizationSummary', () => {
  const summary = {
    organization: {
      id: 'o1',
      name: 'Finca Landak',
      created_at: '2026-10-25T00:00:00Z',
      deleted_at: null,
    },
    members: [
      {
        user_id: 'u1',
        email: 'owner@landak.test',
        display_name: null,
        role: 'owner',
        joined_at: '2026-10-25T00:00:00Z',
      },
    ],
    pending_invites: [
      {
        id: 'i1',
        label: null,
        role: 'reviewer',
        created_at: '2026-10-25T00:00:00Z',
        expires_at: '2026-11-01T00:00:00Z',
      },
    ],
    apiaries: [
      { id: 'a1', name: 'Vallecito 1', hives_active: 2, hives_total: 3, last_inspection_at: null },
    ],
  }

  it('accepts the RPC result and null for an unknown id', () => {
    expect(parseOrganizationSummary(summary)).toEqual(summary)
    expect(parseOrganizationSummary(null)).toBeNull()
  })

  it('refuses a malformed result', () => {
    expect(() => parseOrganizationSummary({ ...summary, members: [{ role: 'admin' }] })).toThrow()
    expect(() => parseOrganizationSummary({ ...summary, organization: null })).toThrow()
  })
})
