import { describe, expect, it } from 'vitest'
import { AdminError, adminErrorMessage, rpcError } from './admin-errors'
import { networkErrorMessage } from './auth'

const fallback = 'No pudimos guardar el cambio. Inténtalo de nuevo.'

describe('adminErrorMessage', () => {
  it('explains every rule in Spanish', () => {
    expect(adminErrorMessage(new AdminError('last_owner'), fallback)).toBe(
      'La finca debe tener al menos un propietario.',
    )
    expect(adminErrorMessage(new AdminError('last_admin'), fallback)).toBe(
      'Debe quedar al menos un administrador activo.',
    )
    expect(adminErrorMessage(new AdminError('own_admin'), fallback)).toMatch(/propio permiso/)
    expect(adminErrorMessage(new AdminError('own_account'), fallback)).toMatch(/tu propia cuenta/)
    expect(adminErrorMessage(new AdminError('already_member'), fallback)).toBe(
      'Ya pertenece a esa finca.',
    )
    expect(adminErrorMessage(new AdminError('wrong_password'), fallback)).toBe(
      'La contraseña actual no es correcta.',
    )
    expect(adminErrorMessage(new AdminError('invalid_user'), fallback)).toBe(
      'Revisa los datos del formulario.',
    )
  })

  it('falls back without showing codes', () => {
    expect(adminErrorMessage(new AdminError('server_error'), fallback)).toBe(fallback)
    expect(adminErrorMessage(new Error('boom'), fallback)).toBe(fallback)
    expect(adminErrorMessage(new TypeError('Failed to fetch'), fallback)).toBe(networkErrorMessage)
  })
})

describe('rpcError', () => {
  it('keeps the P0001 detail as the code', () => {
    expect(rpcError({ code: 'P0001', details: 'last_owner', message: 'x' }).code).toBe('last_owner')
    expect(rpcError({ code: '42501', details: null, message: 'denied' }).code).toBe('server_error')
    expect(rpcError('boom').code).toBe('server_error')
  })
})
