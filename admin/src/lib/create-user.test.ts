import { describe, expect, it } from 'vitest'
import { networkErrorMessage } from './auth'
import {
  CreateUserError,
  type CreateUserForm,
  createUserErrorMessage,
  generatePassword,
  validateCreateUser,
} from './create-user'

const beekeeper: CreateUserForm = {
  kind: 'beekeeper',
  displayName: 'Ana',
  email: 'ana@landak.test',
  password: 'abcdefgh',
  organizationName: 'Finca Ana',
  organizationId: null,
}

describe('validateCreateUser', () => {
  it('accepts a complete beekeeper, reviewer and admin', () => {
    expect(validateCreateUser(beekeeper)).toEqual({})
    expect(
      validateCreateUser({
        ...beekeeper,
        kind: 'reviewer',
        organizationName: '',
        organizationId: 'x',
      }),
    ).toEqual({})
    expect(validateCreateUser({ ...beekeeper, kind: 'admin', organizationName: '' })).toEqual({})
  })

  it('flags each field', () => {
    const errors = validateCreateUser({
      ...beekeeper,
      displayName: '  ',
      email: 'ana',
      password: 'short',
      organizationName: ' ',
    })
    expect(Object.keys(errors).sort()).toEqual([
      'displayName',
      'email',
      'organizationName',
      'password',
    ])
  })

  it('limits lengths like the database', () => {
    expect(
      validateCreateUser({ ...beekeeper, displayName: 'a'.repeat(81) }).displayName,
    ).toBeDefined()
    expect(validateCreateUser({ ...beekeeper, password: 'a'.repeat(73) }).password).toBeDefined()
    expect(
      validateCreateUser({ ...beekeeper, organizationName: 'a'.repeat(121) }).organizationName,
    ).toBeDefined()
  })

  it('asks a reviewer for a farm', () => {
    expect(validateCreateUser({ ...beekeeper, kind: 'reviewer' }).organizationId).toBe(
      'Elige la finca.',
    )
  })
})

describe('generatePassword', () => {
  it('gives 12 characters without look-alikes', () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword()
      expect(password).toHaveLength(12)
      expect(password).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/)
    }
  })
})

describe('createUserErrorMessage', () => {
  it('maps each code to Spanish', () => {
    expect(createUserErrorMessage(new CreateUserError('email_taken'))).toBe(
      'Ya existe una cuenta con ese correo.',
    )
    expect(createUserErrorMessage(new CreateUserError('organization_not_found'))).toBe(
      'Esa finca ya no existe. Elige otra.',
    )
    expect(createUserErrorMessage(new CreateUserError('not_platform_admin'))).toMatch(/permiso/)
    expect(createUserErrorMessage(new CreateUserError('invalid_email'))).toBe(
      'Revisa los datos del formulario.',
    )
    expect(createUserErrorMessage(new CreateUserError('network'))).toBe(networkErrorMessage)
    expect(createUserErrorMessage(new TypeError('Failed to fetch'))).toBe(networkErrorMessage)
  })

  it('never shows an unknown code', () => {
    expect(createUserErrorMessage(new CreateUserError('server_error'))).toBe(
      'No pudimos crear el usuario. Inténtalo de nuevo.',
    )
    expect(createUserErrorMessage('boom')).toBe('No pudimos crear el usuario. Inténtalo de nuevo.')
  })
})
