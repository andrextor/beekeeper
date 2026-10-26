import { useQueryClient } from '@tanstack/react-query'
import { isRole, type Role, uuidPattern } from './admin-api'
import { AdminError, adminErrorMessage, invokeAdminFunction, rpcError } from './admin-errors'
import { isRecord } from './guards'
import { supabase } from './supabase'

// Every list that shows an account, a membership or a count of them.
const accountQueryKeys = [
  'admin-user',
  'admin-users',
  'admin-org',
  'admin-orgs',
  'admin-orgs-recent',
  'admin-stats',
]

/** After any change to accounts or memberships: refetch every list that shows them. */
export function useRefreshAccounts() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(accountQueryKeys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
}

export function manageErrorMessage(error: unknown): string {
  return adminErrorMessage(error, 'No pudimos guardar el cambio. Inténtalo de nuevo.')
}

export type UserMembership = {
  organizationId: string
  name: string
  deletedAt: string | null
  role: Role
  since: string
}

export type UserDetail = {
  id: string
  email: string
  displayName: string | null
  isPlatformAdmin: boolean
  deactivatedAt: string | null
  createdAt: string
  memberships: UserMembership[]
}

export async function fetchUserDetail(id: string): Promise<UserDetail | null> {
  if (!uuidPattern.test(id)) return null
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, display_name, is_platform_admin, deactivated_at, created_at, organization_members(role, created_at, organizations(id, name, deleted_at))',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const memberships = data.organization_members.flatMap((member): UserMembership[] => {
    const organization: unknown = member.organizations
    if (!isRecord(organization) || typeof organization.id !== 'string' || !isRole(member.role)) {
      return []
    }
    return [
      {
        organizationId: organization.id,
        name: typeof organization.name === 'string' ? organization.name : '',
        deletedAt: typeof organization.deleted_at === 'string' ? organization.deleted_at : null,
        role: member.role,
        since: member.created_at,
      },
    ]
  })
  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    isPlatformAdmin: data.is_platform_admin,
    deactivatedAt: data.deactivated_at,
    createdAt: data.created_at,
    memberships: memberships.sort((a, b) => a.name.localeCompare(b.name, 'es')),
  }
}

export function userDetailQuery(id: string) {
  return { queryKey: ['admin-user', id], queryFn: () => fetchUserDetail(id) }
}

async function check(result: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await result
  if (error) throw rpcError(error)
}

export const setDisplayName = (userId: string, name: string) =>
  check(supabase.rpc('admin_set_display_name', { p_user_id: userId, p_display_name: name.trim() }))

export const setMemberRole = (organizationId: string, userId: string, role: Role) =>
  check(
    supabase.rpc('admin_set_member_role', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_role: role,
    }),
  )

export const addMember = (organizationId: string, userId: string, role: Role) =>
  check(
    supabase.rpc('admin_add_member', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_role: role,
    }),
  )

export const removeMember = (organizationId: string, userId: string) =>
  check(
    supabase.rpc('admin_remove_member', { p_organization_id: organizationId, p_user_id: userId }),
  )

export const setPlatformAdmin = (userId: string, value: boolean) =>
  check(supabase.rpc('admin_set_platform_admin', { p_user_id: userId, p_value: value }))

type AuthAction =
  | { action: 'set_email'; email: string }
  | { action: 'set_password'; password: string }
  | { action: 'deactivate' }
  | { action: 'reactivate' }

export async function updateUserAuth(userId: string, change: AuthAction): Promise<void> {
  await invokeAdminFunction('admin-update-user', { user_id: userId, ...change })
}

export const updateOwnName = (userId: string, name: string) =>
  check(supabase.from('profiles').update({ display_name: name.trim() }).eq('id', userId))

/** Checks the current password first, so an open session left on a shared computer cannot change it. */
export async function changeOwnPassword(
  email: string,
  current: string,
  next: string,
): Promise<void> {
  const verified = await supabase.auth.signInWithPassword({ email, password: current })
  if (verified.error) {
    throw verified.error.code === 'invalid_credentials'
      ? new AdminError('wrong_password')
      : verified.error
  }
  const updated = await supabase.auth.updateUser({ password: next })
  if (updated.error) {
    const code = updated.error.code
    throw new AdminError(
      code === 'same_password'
        ? 'same_password'
        : code === 'weak_password'
          ? 'invalid_password'
          : 'server_error',
    )
  }
}
