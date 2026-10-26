// A7: a platform admin fixes another account: email, password, and deactivating (blocks sign-in, keeps history).
// Spec: docs/superpowers/specs/2026-10-25-admin-07-manage-users-design.md
import type {
  AdminUserAttributes,
  PostgrestError,
  SupabaseClient,
} from 'npm:@supabase/supabase-js@2.118.0'
import {
  authInputError,
  isRecord,
  parseEmail,
  parsePassword,
  respond,
  serveAdmin,
  uuidPattern,
} from '../_shared/admin.ts'

// admin_set_deactivated errors the panel can explain; anything else is a 500.
const deactivateStatus: Record<string, number> = {
  not_platform_admin: 403,
  user_not_found: 404,
  own_account: 409,
  last_owner: 409,
  last_admin: 409,
}

// 100 years: Auth has no "forever"; 'none' lifts it.
const banForever = '876000h'

async function updateAuth(
  admin: SupabaseClient,
  userId: string,
  attributes: AdminUserAttributes,
): Promise<Response | null> {
  const updated = await admin.auth.admin.updateUserById(userId, attributes)
  if (!updated.error) return null
  if (updated.error.code === 'user_not_found' || updated.error.status === 404) {
    return respond(404, { error: 'user_not_found' })
  }
  const code = authInputError(updated.error.code)
  if (code) return respond(code === 'email_taken' ? 409 : 400, { error: code })
  throw updated.error
}

function sqlError(error: PostgrestError): Response {
  const status = deactivateStatus[error.details ?? '']
  if (status) return respond(status, { error: error.details })
  throw error
}

async function deactivatedAt(admin: SupabaseClient, userId: string): Promise<string | null> {
  const profile = await admin
    .from('profiles')
    .select('deactivated_at')
    .eq('id', userId)
    .maybeSingle()
  if (profile.error) throw profile.error
  if (!profile.data) throw new Error('user_not_found')
  return profile.data.deactivated_at
}

/**
 * profiles.deactivated_at is the source of truth (SQL holds the rules under locks); Auth's ban follows
 * whatever SQL says at this moment, so two admins racing on one account converge on SQL's last value.
 */
async function syncBan(admin: SupabaseClient, userId: string): Promise<void> {
  const deactivated = (await deactivatedAt(admin, userId)) !== null
  // ponytail: an open session keeps its access token until it expires (≤ 1 h); add an RLS check on
  // profiles.deactivated_at if that hour ever matters.
  const banned = await admin.auth.admin.updateUserById(userId, {
    ban_duration: deactivated ? banForever : 'none',
  })
  if (banned.error) throw banned.error
}

async function setDeactivated(
  admin: SupabaseClient,
  actorId: string,
  userId: string,
  value: boolean,
): Promise<Response> {
  const mark = (on: boolean) =>
    admin.rpc('admin_set_deactivated', { p_actor_id: actorId, p_user_id: userId, p_value: on })

  let before: string | null
  try {
    before = await deactivatedAt(admin, userId)
  } catch (error) {
    if (error instanceof Error && error.message === 'user_not_found') {
      return respond(404, { error: 'user_not_found' })
    }
    throw error
  }

  // SQL first: it holds the own-account, last-owner and last-admin rules under locks.
  const marked = await mark(value)
  if (marked.error) return sqlError(marked.error)
  try {
    await syncBan(admin, userId)
  } catch (error) {
    // Put SQL back only if this request changed it, so a repeated click never undoes an earlier state.
    if ((before !== null) !== value) {
      const reverted = await mark(before !== null)
      if (reverted.error)
        console.error('admin-update-user could not revert deactivated_at for', userId)
    }
    throw error
  }
  return respond(200, { ok: true })
}

serveAdmin('admin-update-user', async ({ admin, actorId, body }) => {
  if (!isRecord(body)) return respond(400, { error: 'invalid_body' })
  const userId = typeof body.user_id === 'string' ? body.user_id : ''
  if (!uuidPattern.test(userId)) return respond(400, { error: 'invalid_user' })

  // Your own email and password are changed in Mi cuenta, which asks for the current password first.
  if ((body.action === 'set_email' || body.action === 'set_password') && userId === actorId) {
    return respond(409, { error: 'use_my_account' })
  }

  switch (body.action) {
    case 'set_email': {
      const email = parseEmail(body.email)
      if (!email) return respond(400, { error: 'invalid_email' })
      // The sync_profile_email trigger copies it to profiles.email.
      return (
        (await updateAuth(admin, userId, { email, email_confirm: true })) ??
        respond(200, { ok: true })
      )
    }
    case 'set_password': {
      const password = parsePassword(body.password)
      if (!password) return respond(400, { error: 'invalid_password' })
      return (await updateAuth(admin, userId, { password })) ?? respond(200, { ok: true })
    }
    case 'deactivate':
      return setDeactivated(admin, actorId, userId, true)
    case 'reactivate':
      return setDeactivated(admin, actorId, userId, false)
    default:
      return respond(400, { error: 'invalid_action' })
  }
})
