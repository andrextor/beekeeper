import { FunctionsFetchError } from '@supabase/supabase-js'
import { networkErrorMessage } from './auth'
import { isRecord } from './guards'
import { supabase } from './supabase'

export type UserKind = 'beekeeper' | 'reviewer' | 'admin'

export type CreateUserForm = {
  kind: UserKind
  displayName: string
  email: string
  password: string
  organizationName: string
  organizationId: string | null
}

export type CreateUserField =
  | 'displayName'
  | 'email'
  | 'password'
  | 'organizationName'
  | 'organizationId'

export type CreatedUser = { userId: string; organizationId: string | null }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The same rules as the admin-create-user function, so most mistakes never leave the browser. */
export function validateCreateUser(form: CreateUserForm): Partial<Record<CreateUserField, string>> {
  const errors: Partial<Record<CreateUserField, string>> = {}
  const name = form.displayName.trim()
  if (name.length < 1 || name.length > 80)
    errors.displayName = 'Escribe el nombre (hasta 80 caracteres).'
  const email = form.email.trim()
  if (email.length > 254 || !emailPattern.test(email)) errors.email = 'Escribe un correo válido.'
  if (form.password.length < 8 || form.password.length > 72) {
    errors.password = 'La contraseña debe tener entre 8 y 72 caracteres.'
  }
  if (form.kind === 'beekeeper') {
    const farm = form.organizationName.trim()
    if (farm.length < 1 || farm.length > 120) {
      errors.organizationName = 'Escribe el nombre de la finca (hasta 120 caracteres).'
    }
  }
  if (form.kind === 'reviewer' && !form.organizationId) errors.organizationId = 'Elige la finca.'
  return errors
}

// No look-alikes (0 O 1 l I): the password is read aloud or typed from a chat.
const passwordAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generatePassword(length = 12): string {
  // Bytes at or above the last full multiple of the alphabet are dropped, so every character is equally likely.
  const limit = 256 - (256 % passwordAlphabet.length)
  let password = ''
  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && password.length < length) {
        password += passwordAlphabet[byte % passwordAlphabet.length]
      }
    }
  }
  return password
}

export class CreateUserError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'CreateUserError'
  }
}

const messages: Record<string, string> = {
  email_taken: 'Ya existe una cuenta con ese correo.',
  organization_not_found: 'Esa finca ya no existe. Elige otra.',
  not_platform_admin: 'Tu sesión no tiene permiso para crear usuarios. Vuelve a ingresar.',
  not_signed_in: 'Tu sesión no tiene permiso para crear usuarios. Vuelve a ingresar.',
  network: networkErrorMessage,
}
const invalidMessage = 'Revisa los datos del formulario.'
const fallbackMessage = 'No pudimos crear el usuario. Inténtalo de nuevo.'

export function createUserErrorMessage(error: unknown): string {
  if (error instanceof TypeError) return networkErrorMessage
  if (!(error instanceof CreateUserError)) return fallbackMessage
  if (error.code.startsWith('invalid_')) return invalidMessage
  return messages[error.code] ?? fallbackMessage
}

async function errorCode(error: unknown, response: Response | undefined): Promise<string> {
  if (error instanceof FunctionsFetchError) return 'network'
  // FunctionsHttpError keeps the function's Response as its context.
  const source =
    response ?? (isRecord(error) && error.context instanceof Response ? error.context : null)
  if (!source) return 'server_error'
  try {
    const body: unknown = await source.json()
    return isRecord(body) && typeof body.error === 'string' ? body.error : 'server_error'
  } catch {
    return 'server_error'
  }
}

export async function createUser(form: CreateUserForm): Promise<CreatedUser> {
  const { data, error, response } = await supabase.functions.invoke('admin-create-user', {
    body: {
      kind: form.kind,
      display_name: form.displayName.trim(),
      email: form.email.trim(),
      password: form.password,
      organization_name: form.kind === 'beekeeper' ? form.organizationName.trim() : undefined,
      organization_id: form.kind === 'reviewer' ? form.organizationId : undefined,
    },
  })
  if (error) throw new CreateUserError(await errorCode(error, response))
  if (!isRecord(data) || typeof data.user_id !== 'string') throw new CreateUserError('server_error')
  return {
    userId: data.user_id,
    organizationId: typeof data.organization_id === 'string' ? data.organization_id : null,
  }
}
