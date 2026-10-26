// A6: only a platform admin creates accounts (beekeeper + farm, reviewer in a farm, or another admin).
// Runs inside Supabase, the only place the secret key may live. Spec: docs/superpowers/specs/2026-10-25-admin-06-create-users-design.md
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isKind(value: unknown): value is Kind {
  return value === 'beekeeper' || value === 'reviewer' || value === 'admin'
}

function trimmed(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null
}

/** The validated input, or the error code to answer with. */
function parseInput(body: unknown): Input | string {
  if (!isRecord(body)) return 'invalid_body'
  if (!isKind(body.kind)) return 'invalid_kind'
  const email = trimmed(body.email)?.toLowerCase() ?? ''
  if (email.length > 254 || !emailPattern.test(email)) return 'invalid_email'
  const password = typeof body.password === 'string' ? body.password : ''
  // bcrypt (Auth) stops at 72 bytes, not characters: accents and emoji take more than one.
  if (password.length < 8 || new TextEncoder().encode(password).length > 72)
    return 'invalid_password'
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

/** New API keys arrive as SUPABASE_SECRET_KEYS (JSON); the local stack still gives the legacy one. */
function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keys) {
    const parsed: unknown = JSON.parse(keys)
    if (isRecord(parsed) && typeof parsed.default === 'string') return parsed.default
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!legacy) throw new Error('No secret key in the function environment')
  return legacy
}

async function handle(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond(405, { error: 'method_not_allowed' })

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!token) return respond(401, { error: 'not_signed_in' })

  const url = Deno.env.get('SUPABASE_URL')
  if (!url) throw new Error('No SUPABASE_URL in the function environment')
  const admin = createClient(url, secretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const caller = await admin.auth.getUser(token)
  if (caller.error || !caller.data.user) return respond(401, { error: 'not_signed_in' })
  const actorId = caller.data.user.id
  const profile = await admin
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', actorId)
    .maybeSingle()
  if (profile.error) throw profile.error
  if (profile.data?.is_platform_admin !== true) return respond(403, { error: 'not_platform_admin' })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return respond(400, { error: 'invalid_body' })
  }
  const input = parseInput(body)
  if (typeof input === 'string') return respond(400, { error: input })

  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (created.error) {
    const code = created.error.code ?? ''
    if (code === 'email_exists') return respond(409, { error: 'email_taken' })
    if (code === 'email_address_invalid' || code === 'validation_failed') {
      return respond(400, { error: 'invalid_email' })
    }
    if (code === 'weak_password') return respond(400, { error: 'invalid_password' })
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
}

Deno.serve(async (request) => {
  try {
    return await handle(request)
  } catch (error) {
    // The request body (with the password) is never logged, only what failed.
    console.error('admin-create-user failed', error instanceof Error ? error.message : error)
    return respond(500, { error: 'server_error' })
  }
})
