import { AdminError, adminErrorMessage, invokeAdminFunction } from './admin-errors'

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

export function nameError(name: string): string | undefined {
  const trimmed = name.trim()
  return trimmed.length < 1 || trimmed.length > 80
    ? 'Escribe el nombre (hasta 80 caracteres).'
    : undefined
}

export function emailError(email: string): string | undefined {
  const trimmed = email.trim()
  return trimmed.length > 254 || !emailPattern.test(trimmed)
    ? 'Escribe un correo válido.'
    : undefined
}

/** Auth's limit is 72 bytes: accents and emoji take more than one. */
export function passwordError(password: string): string | undefined {
  return password.length < 8 || new TextEncoder().encode(password).length > 72
    ? 'La contraseña debe tener entre 8 y 72 caracteres.'
    : undefined
}

/** The same rules as the admin-create-user function, so most mistakes never leave the browser. */
export function validateCreateUser(form: CreateUserForm): Partial<Record<CreateUserField, string>> {
  const errors: Partial<Record<CreateUserField, string>> = {}
  const displayName = nameError(form.displayName)
  if (displayName) errors.displayName = displayName
  const email = emailError(form.email)
  if (email) errors.email = email
  const password = passwordError(form.password)
  if (password) errors.password = password
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

export function createUserErrorMessage(error: unknown): string {
  return adminErrorMessage(error, 'No pudimos crear el usuario. Inténtalo de nuevo.')
}

export async function createUser(form: CreateUserForm): Promise<CreatedUser> {
  const data = await invokeAdminFunction('admin-create-user', {
    kind: form.kind,
    display_name: form.displayName.trim(),
    email: form.email.trim(),
    password: form.password,
    organization_name: form.kind === 'beekeeper' ? form.organizationName.trim() : undefined,
    organization_id: form.kind === 'reviewer' ? form.organizationId : undefined,
  })
  if (typeof data.user_id !== 'string') throw new AdminError('server_error')
  return {
    userId: data.user_id,
    organizationId: typeof data.organization_id === 'string' ? data.organization_id : null,
  }
}
