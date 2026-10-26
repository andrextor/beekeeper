import type { Database } from './database.types'
import { supabase } from './supabase'

export const pageSize = 25

const statKeys = [
  'organizations',
  'users',
  'reviewers',
  'apiaries',
  'hives_active',
  'hives_total',
  'inspections_30d',
  'events_30d',
  'photos',
  'storage_bytes',
] as const

export type AdminStats = Record<(typeof statKeys)[number], number>

type Functions = Database['public']['Functions']
type GeneratedOrganization = Functions['admin_list_organizations']['Returns'][number]
type GeneratedUser = Functions['admin_list_users']['Returns'][number]

// The generator marks every returned column as non-null; these can be null.
export type OrganizationRow = Omit<GeneratedOrganization, 'deleted_at' | 'last_inspection_at'> & {
  deleted_at: string | null
  last_inspection_at: string | null
}

export type Membership = {
  id: string
  name: string
  role: 'owner' | 'reviewer'
  deleted_at: string | null
}

export type UserRow = Omit<GeneratedUser, 'display_name' | 'organizations'> & {
  display_name: string | null
  organizations: Membership[]
}

export type Page<T> = { rows: T[]; total: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseStats(value: unknown): AdminStats {
  if (!isRecord(value)) throw new Error('Unexpected admin_stats result')
  const stats: Partial<AdminStats> = {}
  for (const key of statKeys) {
    const count = value[key]
    if (typeof count !== 'number') throw new Error(`admin_stats.${key} is not a number`)
    stats[key] = count
  }
  return stats as AdminStats
}

function isMembership(value: unknown): value is Membership {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.role === 'owner' || value.role === 'reviewer') &&
    (value.deleted_at === null || typeof value.deleted_at === 'string')
  )
}

export function parseMemberships(value: unknown): Membership[] {
  if (!Array.isArray(value) || !value.every(isMembership)) {
    throw new Error('Unexpected admin_list_users organizations')
  }
  return value
}

export function pageCount(total: number, size = pageSize): number {
  return Math.max(1, Math.ceil(total / size))
}

/** The admin flag was removed while signed in: the RPCs raise P0001 with this detail. */
export function isNotPlatformAdmin(error: unknown): boolean {
  return isRecord(error) && error.details === 'not_platform_admin'
}

function range(page: number, size: number) {
  return { p_limit: size, p_offset: (page - 1) * size }
}

export async function fetchStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats')
  if (error) throw error
  return parseStats(data)
}

export async function fetchOrganizations(
  search: string,
  page: number,
  size = pageSize,
): Promise<Page<OrganizationRow>> {
  const { data, error } = await supabase.rpc('admin_list_organizations', {
    p_search: search || undefined,
    ...range(page, size),
  })
  if (error) throw error
  return { rows: data, total: data[0]?.total_count ?? 0 }
}

export async function fetchUsers(search: string, page: number): Promise<Page<UserRow>> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: search || undefined,
    ...range(page, pageSize),
  })
  if (error) throw error
  return {
    rows: data.map((row) => ({ ...row, organizations: parseMemberships(row.organizations) })),
    total: data[0]?.total_count ?? 0,
  }
}
