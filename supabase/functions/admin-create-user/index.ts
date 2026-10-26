// A6: only a platform admin creates accounts (beekeeper + farm, reviewer in a farm, or another admin).
// Runs inside Supabase, the only place the secret key may live. Spec: docs/superpowers/specs/2026-10-25-admin-06-create-users-design.md
import {
  authInputError,
  isRecord,
  parseEmail,
  parsePassword,
  respond,
  serveAdmin,
  trimmed,
  uuidPattern,
} from '../_shared/admin.ts'

type Kind = 'beekeeper' | 'reviewer' | 'admin'

type Input = {
  kind: Kind
  email: string
  password: string
  displayName: string
  organizationName: string | null
  organizationId: string | null
}

const roles: Record<Kind, 'owner' | 'reviewer' | 'admin'> = {
  beekeeper: 'owner',
  reviewer: 'reviewer',
  admin: 'admin',
}

// admin_provision_member errors the panel can explain; anything else is a 500.
const provisionStatus: Record<string, number> = {
  not_platform_admin: 403,
  organization_not_found: 404,
}

function isKind(value: unknown): value is Kind {
  return value === 'beekeeper' || value === 'reviewer' || value === 'admin'
}

/** The validated input, or the error code to answer with. */
function parseInput(body: unknown): Input | string {
  if (!isRecord(body)) return 'invalid_body'
  if (!isKind(body.kind)) return 'invalid_kind'
  const email = parseEmail(body.email)
  if (!email) return 'invalid_email'
  const password = parsePassword(body.password)
  if (!password) return 'invalid_password'
  const displayName = trimmed(body.display_name) ?? ''
  if (displayName.length < 1 || displayName.length > 80) return 'invalid_name'

  let organizationName: string | null = null
  let organizationId: string | null = null
  if (body.kind === 'beekeeper') {
    organizationName = trimmed(body.organization_name) ?? ''
    if (organizationName.length < 1 || organizationName.length > 120) {
      return 'invalid_organization_name'
    }
  }
  if (body.kind === 'reviewer') {
    organizationId = trimmed(body.organization_id) ?? ''
    if (!uuidPattern.test(organizationId)) return 'invalid_organization'
  }
  return { kind: body.kind, email, password, displayName, organizationName, organizationId }
}

serveAdmin('admin-create-user', async ({ admin, actorId, body }) => {
  const input = parseInput(body)
  if (typeof input === 'string') return respond(400, { error: input })

  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (created.error) {
    const code = authInputError(created.error.code)
    if (code) return respond(code === 'email_taken' ? 409 : 400, { error: code })
    throw created.error
  }
  const userId = created.data.user.id

  const provisioned = await admin.rpc('admin_provision_member', {
    p_actor_id: actorId,
    p_user_id: userId,
    p_display_name: input.displayName,
    p_role: roles[input.kind],
    p_organization_id: input.organizationId,
    p_organization_name: input.organizationName,
  })
  if (provisioned.error) {
    // No half-made accounts: the profile goes with the Auth user (on delete cascade).
    const rollback = await admin.auth.admin.deleteUser(userId)
    if (rollback.error) {
      // Left for Iván to delete in Authentication → Users; the email is taken until then.
      console.error('admin-create-user rollback failed for user', userId, rollback.error.message)
    }
    const status = provisionStatus[provisioned.error.details ?? '']
    if (status) return respond(status, { error: provisioned.error.details })
    throw provisioned.error
  }

  return respond(200, { user_id: userId, organization_id: provisioned.data ?? null })
})
