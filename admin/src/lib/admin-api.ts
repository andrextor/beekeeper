import { queryOptions } from '@tanstack/react-query'
import type { Database, Tables } from './database.types'
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

export type Role = 'owner' | 'reviewer'

export type Membership = {
  id: string
  name: string
  role: Role
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

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isRole(value: unknown): value is Role {
  return value === 'owner' || value === 'reviewer'
}

function isMembership(value: unknown): value is Membership {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isRole(value.role) &&
    isNullableString(value.deleted_at)
  )
}

export function parseMemberships(value: unknown): Membership[] {
  if (!isArrayOf(value, isMembership)) {
    throw new Error('Unexpected admin_list_users organizations')
  }
  return value
}

export type Member = {
  user_id: string
  email: string
  display_name: string | null
  role: Role
  joined_at: string
}

export type PendingInvite = {
  id: string
  label: string | null
  role: Role
  created_at: string
  expires_at: string
}

export type ApiarySummary = {
  id: string
  name: string
  hives_active: number
  hives_total: number
  last_inspection_at: string | null
}

export type OrganizationSummary = {
  organization: { id: string; name: string; created_at: string; deleted_at: string | null }
  members: Member[]
  pending_invites: PendingInvite[]
  apiaries: ApiarySummary[]
}

function isMember(value: unknown): value is Member {
  return (
    isRecord(value) &&
    typeof value.user_id === 'string' &&
    typeof value.email === 'string' &&
    isNullableString(value.display_name) &&
    isRole(value.role) &&
    typeof value.joined_at === 'string'
  )
}

function isPendingInvite(value: unknown): value is PendingInvite {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isNullableString(value.label) &&
    isRole(value.role) &&
    typeof value.created_at === 'string' &&
    typeof value.expires_at === 'string'
  )
}

function isApiarySummary(value: unknown): value is ApiarySummary {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.hives_active === 'number' &&
    typeof value.hives_total === 'number' &&
    isNullableString(value.last_inspection_at)
  )
}

function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard)
}

/** admin_organization_summary returns null for an unknown id. */
export function parseOrganizationSummary(value: unknown): OrganizationSummary | null {
  if (value === null) return null
  const organization = isRecord(value) ? value.organization : undefined
  if (
    !isRecord(value) ||
    !isRecord(organization) ||
    typeof organization.id !== 'string' ||
    typeof organization.name !== 'string' ||
    typeof organization.created_at !== 'string' ||
    !isNullableString(organization.deleted_at) ||
    !isArrayOf(value.members, isMember) ||
    !isArrayOf(value.pending_invites, isPendingInvite) ||
    !isArrayOf(value.apiaries, isApiarySummary)
  ) {
    throw new Error('Unexpected admin_organization_summary result')
  }
  return {
    organization: {
      id: organization.id,
      name: organization.name,
      created_at: organization.created_at,
      deleted_at: organization.deleted_at,
    },
    members: value.members,
    pending_invites: value.pending_invites,
    apiaries: value.apiaries,
  }
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

export async function fetchUsers(
  search: string,
  page: number,
  size = pageSize,
): Promise<Page<UserRow>> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: search || undefined,
    ...range(page, size),
  })
  if (error) throw error
  return {
    rows: data.map((row) => ({ ...row, organizations: parseMemberships(row.organizations) })),
    total: data[0]?.total_count ?? 0,
  }
}

// A hand-edited URL must read as "not found", not as a database error.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function fetchOrganizationSummary(id: string): Promise<OrganizationSummary | null> {
  if (!uuidPattern.test(id)) return null
  const { data, error } = await supabase.rpc('admin_organization_summary', {
    p_organization_id: id,
  })
  if (error) throw error
  return parseOrganizationSummary(data)
}

/** Shared by the organization and apiary pages, so the breadcrumb reuses the cache. */
export function organizationSummaryQuery(id: string) {
  return queryOptions({
    queryKey: ['admin-org', id],
    queryFn: () => fetchOrganizationSummary(id),
  })
}

export type Apiary = Tables<'apiaries'>
export type Hive = Tables<'hives'>

export async function fetchApiary(id: string): Promise<Apiary | null> {
  if (!uuidPattern.test(id)) return null
  const { data, error } = await supabase
    .from('apiaries')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

// ponytail: one apiary holds tens of hives, so no pagination; add it if apiaries grow past a few hundred.
export async function fetchHives(apiaryId: string): Promise<Hive[]> {
  const { data, error } = await supabase
    .from('hives')
    .select('*')
    .eq('apiary_id', apiaryId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw error
  return data
}
