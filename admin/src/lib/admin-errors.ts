import { FunctionsFetchError } from '@supabase/supabase-js'
import { networkErrorMessage } from './auth'
import { isRecord } from './guards'
import { supabase } from './supabase'

/** A machine code from an admin Edge Function or RPC; the panel shows it only through adminErrorMessage. */
export class AdminError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'AdminError'
  }
}

const sessionMessage = 'Tu sesión no tiene permiso para hacer esto. Vuelve a ingresar.'

const messages: Record<string, string> = {
  email_taken: 'Ya existe una cuenta con ese correo.',
  organization_not_found: 'Esa finca ya no existe. Elige otra.',
  not_platform_admin: sessionMessage,
  not_signed_in: sessionMessage,
  network: networkErrorMessage,
  user_not_found: 'Esa cuenta ya no existe.',
  not_member: 'Esa persona ya no pertenece a la finca.',
  already_member: 'Ya pertenece a esa finca.',
  last_owner: 'Es el único propietario de una finca. Primero haz propietario a otra persona.',
  last_admin: 'Debe quedar al menos un administrador activo.',
  own_admin: 'No puedes quitarte tu propio permiso de administrador.',
  own_account: 'No puedes desactivar tu propia cuenta.',
  use_my_account: 'Tu correo lo cambia otro administrador y tu contraseña se cambia en Mi cuenta.',
  wrong_password: 'La contraseña actual no es correcta.',
  same_password: 'La nueva contraseña debe ser distinta de la actual.',
}

export function adminErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError) return networkErrorMessage
  if (!(error instanceof AdminError)) return fallback
  if (error.code.startsWith('invalid_')) return 'Revisa los datos del formulario.'
  return messages[error.code] ?? fallback
}

/** An RPC's P0001 detail becomes the code; anything else is unexplained. */
export function rpcError(error: unknown): AdminError {
  return new AdminError(
    isRecord(error) && typeof error.details === 'string' ? error.details : 'server_error',
  )
}

async function functionErrorCode(error: unknown, response: Response | undefined): Promise<string> {
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

/** Calls an admin Edge Function; its `{ error }` answers become AdminError. */
export async function invokeAdminFunction(
  name: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error, response } = await supabase.functions.invoke(name, { body })
  if (error) throw new AdminError(await functionErrorCode(error, response))
  if (!isRecord(data)) throw new AdminError('server_error')
  return data
}
