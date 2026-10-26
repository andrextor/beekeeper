import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Eye, EyeOff, ShieldAlert, Sparkles } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { SearchInput } from '../../components/ui/SearchInput'
import { Segmented } from '../../components/ui/Segmented'
import { type FarmOption, searchLiveOrganizations } from '../../lib/admin-api'
import {
  type CreatedUser,
  type CreateUserField,
  type CreateUserForm,
  createUser,
  createUserErrorMessage,
  generatePassword,
  type UserKind,
  validateCreateUser,
} from '../../lib/create-user'

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

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="break-all font-mono text-lg">{value}</span>
        <IconButton
          icon={copied === 'yes' ? Check : Copy}
          label={copied === 'yes' ? 'Copiado' : `Copiar ${label.toLowerCase()}`}
          onClick={copy}
        />
      </span>
      {copied === 'failed' && (
        <span role="alert" className="text-sm text-danger">
          No se pudo copiar. Selecciona el texto y cópialo a mano.
        </span>
      )}
    </div>
  )
}

function FarmPicker({
  value,
  onChange,
  error,
}: {
  value: FarmOption | null
  onChange: (farm: FarmOption | null) => void
  error?: string
}) {
  const [search, setSearch] = useState('')
  const farms = useQuery({
    queryKey: ['admin-orgs', 'picker', search],
    queryFn: () => searchLiveOrganizations(search),
    enabled: value === null,
  })

  if (value) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Finca</span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="font-medium">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-11 text-sm text-primary hover:underline"
          >
            Cambiar
          </button>
        </span>
      </div>
    )
  }

  const rows = farms.data ?? []
  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        label="Finca"
        placeholder="Nombre de la finca"
        value={search}
        onSearch={setSearch}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {farms.isError ? (
        <p className="text-sm text-danger">No pudimos cargar las fincas. Inténtalo de nuevo.</p>
      ) : farms.isPending ? (
        <p className="text-sm text-muted">Cargando fincas…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No hay fincas con ese nombre.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((farm) => (
            <li key={farm.id}>
              <button
                type="button"
                onClick={() => onChange(farm)}
                className="flex min-h-11 w-full flex-col items-start rounded-control px-3 py-2 text-left transition hover:bg-glass-field"
              >
                <span className="font-medium">{farm.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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
      <h2 className="text-xl font-bold">Usuario creado</h2>
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
            className="inline-flex min-h-11 items-center rounded-control px-4 font-medium text-primary hover:underline"
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
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const kind = kindFromParam(params.get('tipo'))
  const [fields, setFields] = useState(emptyForm)
  const [farm, setFarm] = useState<FarmOption | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<CreateUserField, string>>>({})

  const form: CreateUserForm = { kind, ...fields, organizationId: farm?.id ?? null }

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () =>
      Promise.all(
        ['admin-users', 'admin-orgs', 'admin-orgs-recent', 'admin-stats', 'admin-org'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      ),
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
    setShowPassword(false)
    create.reset()
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Usuarios', to: '/usuarios' }, { label: 'Nuevo usuario' }]} />
      <h1 className="text-3xl font-bold">Nuevo usuario</h1>
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
            <div className="flex flex-col gap-2">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                hint="Mínimo 8 caracteres."
                value={fields.password}
                onChange={(event) => set('password')(event.target.value)}
                error={errors.password}
                trailing={
                  <IconButton
                    icon={showPassword ? EyeOff : Eye}
                    label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword((shown) => !shown)}
                  />
                }
              />
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => {
                  set('password')(generatePassword())
                  setShowPassword(true)
                }}
              >
                <Sparkles size={16} aria-hidden />
                Generar
              </Button>
            </div>
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
