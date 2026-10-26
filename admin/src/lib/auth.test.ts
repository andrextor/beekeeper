import { describe, expect, it } from 'vitest'
import { authErrorMessage, networkErrorMessage, safeNextPath } from './auth'

describe('authErrorMessage', () => {
  it('maps Supabase error codes to Spanish', () => {
    expect(
      authErrorMessage({ name: 'AuthApiError', code: 'invalid_credentials', status: 400 }),
    ).toBe('Correo o contraseña incorrectos.')
    expect(authErrorMessage({ name: 'AuthApiError', status: 429 })).toBe(
      'Demasiados intentos. Espera un minuto.',
    )
  })

  it('recognizes network failures', () => {
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toBe(networkErrorMessage)
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      networkErrorMessage,
    )
  })

  it('never shows an unknown message as is', () => {
    expect(authErrorMessage({ code: 'something_new', message: 'Internal detail' })).toBe(
      'No pudimos ingresar. Inténtalo de nuevo.',
    )
    expect(authErrorMessage('boom')).toBe('No pudimos ingresar. Inténtalo de nuevo.')
  })
})

describe('safeNextPath', () => {
  it('keeps internal paths', () => {
    expect(safeNextPath('/apicultores?pagina=2')).toBe('/apicultores?pagina=2')
  })

  it('drops anything that leaves the panel', () => {
    expect(safeNextPath('https://example.com')).toBe('/')
    expect(safeNextPath('//example.com')).toBe('/')
    expect(safeNextPath('/\\example.com')).toBe('/')
    expect(safeNextPath('/\t/example.com')).toBe('/')
    expect(safeNextPath('/.//example.com')).toBe('/')
    expect(safeNextPath(null)).toBe('/')
  })
})
