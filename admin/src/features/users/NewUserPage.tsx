import { useMutation } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Segmented } from '../../components/ui/Segmented'
import type { FarmOption } from '../../lib/admin-api'
import {
  type CreatedUser,
  type CreateUserField,
  type CreateUserForm,
  createUser,
  createUserErrorMessage,
  type UserKind,
  validateCreateUser,
} from '../../lib/create-user'
import { useRefreshAccounts } from '../../lib/manage-user'
import { CopyField, FarmPicker, PasswordField } from './fields'

const kindParams: Readonly<Record<UserKind, string>> = {
  beekeeper: 'apicultor',
  reviewer: 'revisor',
  admin: 'admin',
}

const kinds: ReadonlyArray<{ value: UserKind; label: string }> = [
  { value: 'beekeeper', label: 'Apicultor' },
  { value: 'reviewer', label: 'Revisor' },
  { value: 'admin', label: 'Admin' },
]

function kindFromParam(value: string | null): UserKind {
  return kinds.find((kind) => kindParams[kind.value] === value)?.value ?? 'beekeeper'
}

function Done({
  form,
  created,
  onAnother,
}: {
  form: CreateUserForm
  created: CreatedUser
  onAnother: () => void
}) {
  return (
    <Card className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold">Usuario creado</h2>
      <CopyField label="Correo" value={form.email.trim()} />
      <CopyField label="Contraseña" value={form.password} />
      <p className="rounded-control bg-warning-bg p-3 text-sm">
        Compártela por un canal privado. No se vuelve a mostrar.
      </p>
      <div className="flex flex-wrap gap-3">
        {created.organizationId && (
          <Link
            to={`/apicultores/${created.organizationId}`}
            viewTransition
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {form.kind === 'beekeeper' ? 'Ver apicultor' : 'Ver finca'}
          </Link>
        )}
        <Button variant="secondary" onClick={onAnother}>
          Crear otro
        </Button>
      </div>
    </Card>
  )
}

const emptyForm = {
  displayName: '',
  email: '',
  password: '',
  organizationName: '',
}

export function NewUserPage() {
  const refresh = useRefreshAccounts()
  const [params, setParams] = useSearchParams()
  const kind = kindFromParam(params.get('tipo'))
  const [fields, setFields] = useState(emptyForm)
  const [farm, setFarm] = useState<FarmOption | null>(null)
  const [errors, setErrors] = useState<Partial<Record<CreateUserField, string>>>({})

  const form: CreateUserForm = { kind, ...fields, organizationId: farm?.id ?? null }

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: refresh,
  })

  const set = (field: keyof typeof emptyForm) => (value: string) =>
    setFields((current) => ({ ...current, [field]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateCreateUser(form)
    setErrors(found)
    if (Object.keys(found).length === 0) create.mutate(form)
  }

  const another = () => {
    setFields(emptyForm)
    setFarm(null)
    setErrors({})
    create.reset()
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Usuarios', to: '/usuarios' }, { label: 'Nuevo usuario' }]} />
      <h1 className="text-2xl font-bold tracking-tight">Nuevo usuario</h1>
      {create.isSuccess ? (
        <Done form={create.variables} created={create.data} onAnother={another} />
      ) : (
        <Card>
          <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-5">
            <Segmented
              label="Tipo"
              options={kinds}
              value={kind}
              onChange={(next) => {
                setErrors({})
                setParams(next === 'beekeeper' ? {} : { tipo: kindParams[next] }, { replace: true })
              }}
            />
            <Input
              label="Nombre"
              autoComplete="off"
              value={fields.displayName}
              onChange={(event) => set('displayName')(event.target.value)}
              error={errors.displayName}
            />
            <Input
              label="Correo"
              type="email"
              autoComplete="off"
              value={fields.email}
              onChange={(event) => set('email')(event.target.value)}
              error={errors.email}
            />
            <PasswordField
              label="Contraseña"
              value={fields.password}
              onChange={set('password')}
              error={errors.password}
              generate
            />
            {kind === 'beekeeper' && (
              <Input
                label="Nombre de la finca"
                autoComplete="off"
                value={fields.organizationName}
                onChange={(event) => set('organizationName')(event.target.value)}
                error={errors.organizationName}
              />
            )}
            {kind === 'reviewer' && (
              <FarmPicker value={farm} onChange={setFarm} error={errors.organizationId} />
            )}
            {kind === 'admin' && (
              <p className="flex gap-2 rounded-control bg-warning-bg p-3 text-sm">
                <ShieldAlert size={20} className="shrink-0" aria-hidden />
                Podrá ver todos los apicultores y crear usuarios, también otros administradores.
              </p>
            )}
            {create.isError && (
              <p role="alert" className="animate-shake text-sm text-danger">
                {createUserErrorMessage(create.error)}
              </p>
            )}
            <Button type="submit" loading={create.isPending} className="self-start">
              Crear usuario
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
