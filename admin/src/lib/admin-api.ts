import { queryOptions } from '@tanstack/react-query'
import type { Database, Tables } from './database.types'
import { isRecord } from './guards'
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

export type UserRow = Omit<GeneratedUser, 'display_name' | 'deactivated_at' | 'organizations'> & {
  display_name: string | null
  deactivated_at: string | null
  organizations: Membership[]
}

export type Page<T> = { rows: T[]; total: number }

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

export function isRole(value: unknown): value is Role {
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
  deactivated_at: string | null
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
    typeof value.joined_at === 'string' &&
    isNullableString(value.deactivated_at)
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
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

export function apiaryQuery(id: string) {
  return queryOptions({ queryKey: ['admin-apiary', id], queryFn: () => fetchApiary(id) })
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

export function hiveQuery(id: string) {
  return queryOptions({ queryKey: ['admin-hive', id], queryFn: () => fetchHive(id) })
}

export async function fetchHive(id: string): Promise<Hive | null> {
  if (!uuidPattern.test(id)) return null
  const { data, error } = await supabase
    .from('hives')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

export type Inspection = Tables<'inspections'>
export type HiveEvent = Tables<'hive_events'>

type TimelineBase = { id: string; at: string; author_name: string | null }
export type TimelineItem =
  | (TimelineBase & { kind: 'inspection'; inspection: Inspection })
  | (TimelineBase & { kind: 'event'; event: HiveEvent })

export type TimelineCursor = { at: string; id: string }
export type TimelinePage = { items: TimelineItem[]; next: TimelineCursor | null }

export const timelinePageSize = 30

// data is the row's to_jsonb: the columns the screen relies on are checked, the rest share the table's types.
function isInspection(value: unknown): value is Inspection {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.inspected_at === 'string' &&
    typeof value.source === 'string'
  )
}

function isHiveEvent(value: unknown): value is HiveEvent {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.occurred_at === 'string' &&
    typeof value.type === 'string'
  )
}

/** An unknown kind (a newer server) is skipped; a malformed row throws. */
export function parseTimelineRow(row: {
  kind: string
  id: string
  at: string
  author_name: string | null
  data: unknown
}): TimelineItem | null {
  const base = { id: row.id, at: row.at, author_name: row.author_name }
  if (row.kind === 'inspection') {
    if (!isInspection(row.data)) throw new Error('Unexpected hive_timeline inspection')
    return { ...base, kind: 'inspection', inspection: row.data }
  }
  if (row.kind === 'event') {
    if (!isHiveEvent(row.data)) throw new Error('Unexpected hive_timeline event')
    return { ...base, kind: 'event', event: row.data }
  }
  return null
}

export async function fetchTimeline(
  hiveId: string,
  cursor: TimelineCursor | null,
): Promise<TimelinePage> {
  const { data, error } = await supabase.rpc('hive_timeline', {
    p_hive_id: hiveId,
    p_before: cursor?.at,
    p_before_id: cursor?.id,
    p_limit: timelinePageSize,
  })
  if (error) throw error
  const last = data.at(-1)
  return {
    items: data.flatMap((row) => parseTimelineRow(row) ?? []),
    next: last && data.length === timelinePageSize ? { at: last.at, id: last.id } : null,
  }
}

export type Photo = Tables<'photos'> & { inspections: { inspected_at: string } | null }

export const photoPageSize = 48

export async function fetchPhotos(hiveId: string, page: number): Promise<Page<Photo>> {
  const { data, error, count } = await supabase
    .from('photos')
    .select('*, inspections(inspected_at)', { count: 'exact' })
    .eq('hive_id', hiveId)
    .is('deleted_at', null)
    .order('taken_at', { ascending: false })
    .order('id', { ascending: false })
    .range((page - 1) * photoPageSize, page * photoPageSize - 1)
  if (error) throw error
  return { rows: data, total: count ?? 0 }
}

const photoBucket = 'hive-photos'
export const signedUrlSeconds = 3600
// Signed URL queries refetch every 50 min (refetchInterval), so an open page never holds an expired one.
export const signedUrlRefresh = 50 * 60_000

export function thumbnailPath(storagePath: string): string {
  return storagePath.replace(/\.jpg$/, '.thumb.jpg')
}

/** Thumbnail URLs by storage_path in one request; a missing thumbnail falls back to the main file. */
export async function signThumbnails(storagePaths: string[]): Promise<Record<string, string>> {
  if (storagePaths.length === 0) return {}
  const bucket = supabase.storage.from(photoBucket)
  const { data, error } = await bucket.createSignedUrls(
    storagePaths.map(thumbnailPath),
    signedUrlSeconds,
  )
  if (error) throw error
  // Results are matched by the path they carry, never by position.
  const urls: Record<string, string> = {}
  for (const signed of data) {
    if (!signed.error && signed.path && signed.signedUrl) {
      urls[signed.path.replace(/\.thumb\.jpg$/, '.jpg')] = signed.signedUrl
    }
  }
  const missing = storagePaths.filter((path) => !urls[path])
  if (missing.length > 0) {
    const fallback = await bucket.createSignedUrls(missing, signedUrlSeconds)
    if (fallback.error) throw fallback.error
    for (const signed of fallback.data) {
      if (!signed.error && signed.path && signed.signedUrl) urls[signed.path] = signed.signedUrl
    }
  }
  return urls
}

export async function signPhoto(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(photoBucket)
    .createSignedUrl(storagePath, signedUrlSeconds)
  if (error) throw error
  return data.signedUrl
}

export type FarmOption = { id: string; name: string }

/** Live farms by name, for pickers: deleted ones never take a place in the 10. */
export async function searchLiveOrganizations(search: string): Promise<FarmOption[]> {
  let query = supabase
    .from('organizations')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
    .limit(10)
  const term = search.trim()
  if (term) query = query.ilike('name', `%${term}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}
