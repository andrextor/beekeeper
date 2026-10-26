// Shared by the platform admin Edge Functions (A6, A7): CORS, the admin check, validation and errors.
// The secret key is injected by Supabase and never leaves the function runtime.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function trimmed(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null
}

/** Lowercased email, or null when it is not one. */
export function parseEmail(value: unknown): string | null {
  const email = trimmed(value)?.toLowerCase() ?? ''
  return email.length <= 254 && emailPattern.test(email) ? email : null
}

/** bcrypt (Auth) stops at 72 bytes, not characters: accents and emoji take more than one. */
export function parsePassword(value: unknown): string | null {
  const password = typeof value === 'string' ? value : ''
  return password.length >= 8 && new TextEncoder().encode(password).length <= 72 ? password : null
}

/** Auth's own refusals of an email or password are input mistakes (400), not server faults. */
export function authInputError(code: string | undefined): string | null {
  if (code === 'email_exists') return 'email_taken'
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'invalid_email'
  if (code === 'weak_password') return 'invalid_password'
  return null
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

export type AdminRequest = { admin: SupabaseClient; actorId: string; body: unknown }

/**
 * Serves a POST that only a platform admin may make: answers CORS, checks the caller against Auth and
 * profiles.is_platform_admin, parses the JSON body, and turns anything unexpected into a 500.
 */
export function serveAdmin(name: string, handle: (request: AdminRequest) => Promise<Response>) {
  Deno.serve(async (request) => {
    try {
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
        .select('is_platform_admin, deactivated_at')
        .eq('id', actorId)
        .maybeSingle()
      if (profile.error) throw profile.error
      // A deactivated admin may still hold a token for up to an hour: no admin power with it.
      if (profile.data?.is_platform_admin !== true || profile.data.deactivated_at !== null) {
        return respond(403, { error: 'not_platform_admin' })
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return respond(400, { error: 'invalid_body' })
      }
      return await handle({ admin, actorId, body })
    } catch (error) {
      // The request body (it may hold a password) is never logged, only what failed.
      console.error(`${name} failed`, error instanceof Error ? error.message : error)
      return respond(500, { error: 'server_error' })
    }
  })
}
