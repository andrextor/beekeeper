import { useMutation, useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { NotFoundState } from '../../components/ui/NotFoundState'
import { QueryError } from '../../components/ui/QueryError'
import { Segmented } from '../../components/ui/Segmented'
import { Skeleton } from '../../components/ui/Skeleton'
import type { FarmOption, Role } from '../../lib/admin-api'
import { emailError, nameError, passwordError } from '../../lib/create-user'
import { formatDate } from '../../lib/format'
import { roleLabels } from '../../lib/labels'
import {
  addMember,
  manageErrorMessage,
  removeMember,
  setDisplayName,
  setMemberRole,
  setPlatformAdmin,
  type UserDetail,
  type UserMembership,
  updateUserAuth,
  useRefreshAccounts,
  userDetailQuery,
} from '../../lib/manage-user'
import { useSession } from '../../lib/session'
import { CopyField, FarmPicker, PasswordField } from './fields'

type Ask = (confirm: {
  title: string
  label: string
  body?: string
  run: () => Promise<void>
}) => void

const roles: ReadonlyArray<{ value: Role; label: string }> = [
  { value: 'reviewer', label: roleLabels.reviewer },
  { value: 'owner', label: roleLabels.owner },
]

/** One field saved on its own: the name or the email. */
function FieldForm({
  label,
  initial,
  type = 'text',
  validate,
  save,
}: {
  label: string
  initial: string
  type?: string
  validate: (value: string) => string | undefined
  save: (value: string) => Promise<void>
}) {
  const refresh = useRefreshAccounts()
  const [value, setValue] = useState(initial)
  const [invalid, setInvalid] = useState<string>()
  const saving = useMutation({ mutationFn: save, onSuccess: refresh })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate(value)
    setInvalid(found)
    if (!found) saving.mutate(value)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2 md:flex-row md:items-start">
      <Input
        label={label}
        type={type}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          saving.reset()
        }}
        error={invalid ?? (saving.isError ? manageErrorMessage(saving.error) : undefined)}
        hint={saving.isSuccess ? 'Guardado.' : undefined}
        className="md:w-96"
      />
      <Button type="submit" variant="secondary" loading={saving.isPending} className="md:mt-6">
        Guardar
      </Button>
    </form>
  )
}

function PasswordSection({ user }: { user: UserDetail }) {
  const [password, setPassword] = useState('')
  const [invalid, setInvalid] = useState<string>()
  const change = useMutation({
    mutationFn: (next: string) =>
      updateUserAuth(user.id, { action: 'set_password', password: next }),
  })

  if (change.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <CopyField label="Contraseña nueva" value={change.variables} />
        <p className="rounded-control bg-warning-bg p-3 text-sm">
          Compártela por un canal privado. No se vuelve a mostrar. Si tenía la sesión abierta en
          otro equipo, sigue abierta hasta que venza.
        </p>
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => {
            setPassword('')
            change.reset()
          }}
        >
          Listo
        </Button>
      </div>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = passwordError(password)
    setInvalid(found)
    if (!found) change.mutate(password)
  }
  return (
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-3">
      <PasswordField
        label="Contraseña nueva"
        value={password}
        onChange={setPassword}
        error={invalid}
        generate
      />
      {change.isError && (
        <p role="alert" className="text-sm text-danger">
          {manageErrorMessage(change.error)}
        </p>
      )}
      <Button type="submit" loading={change.isPending} className="self-start">
        Cambiar contraseña
      </Button>
    </form>
  )
}

function MembershipRow({
  user,
  membership,
  ask,
}: {
  user: UserDetail
  membership: UserMembership
  ask: Ask
}) {
  const who = user.displayName ?? user.email
  const next: Role = membership.role === 'owner' ? 'reviewer' : 'owner'
  return (
    <li className="flex flex-col gap-2 border-b border-glass-border py-3 last:border-0 md:flex-row md:items-center md:justify-between">
      <span className="flex flex-wrap items-center gap-2">
        <Link
          to={`/apicultores/${membership.organizationId}`}
          viewTransition
          className="font-medium hover:underline"
        >
          {membership.name}
        </Link>
        <Badge tone={membership.role === 'owner' ? 'primary' : 'neutral'}>
          {roleLabels[membership.role]}
        </Badge>
        {membership.deletedAt && <Badge tone="danger">Eliminado</Badge>}
        <span className="text-sm text-muted">desde {formatDate(membership.since)}</span>
      </span>
      {!membership.deletedAt && (
        <span className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              ask({
                title: `¿Hacer a ${who} ${roleLabels[next].toLowerCase()} de ${membership.name}?`,
                label: 'Cambiar rol',
                run: () => setMemberRole(membership.organizationId, user.id, next),
              })
            }
          >
            Hacer {roleLabels[next].toLowerCase()}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              ask({
                title: `¿Quitar a ${who} de ${membership.name}?`,
                body: 'Dejará de ver la finca. Lo que registró se conserva.',
                label: 'Quitar',
                run: () => removeMember(membership.organizationId, user.id),
              })
            }
          >
            Quitar
          </Button>
        </span>
      )}
    </li>
  )
}

function AddMembership({ user }: { user: UserDetail }) {
  const refresh = useRefreshAccounts()
  const [farm, setFarm] = useState<FarmOption | null>(null)
  const [role, setRole] = useState<Role>('reviewer')
  const add = useMutation({
    mutationFn: (target: FarmOption) => addMember(target.id, user.id, role),
    onSuccess: async () => {
      setFarm(null)
      await refresh()
    },
  })
  return (
    <div className="flex max-w-md flex-col gap-3">
      <h3 className="font-medium">Agregar a una finca</h3>
      <FarmPicker
        value={farm}
        onChange={(next) => {
          setFarm(next)
          add.reset()
        }}
      />
      {farm && (
        <>
          <Segmented label="Rol" options={roles} value={role} onChange={setRole} />
          {add.isError && (
            <p role="alert" className="text-sm text-danger">
              {manageErrorMessage(add.error)}
            </p>
          )}
          <Button loading={add.isPending} className="self-start" onClick={() => add.mutate(farm)}>
            Agregar
          </Button>
        </>
      )}
    </div>
  )
}

function AccessSection({ user, selfId, ask }: { user: UserDetail; selfId: string; ask: Ask }) {
  const refresh = useRefreshAccounts()
  const who = user.displayName ?? user.email
  const self = user.id === selfId
  const reactivate = useMutation({
    mutationFn: () => updateUserAuth(user.id, { action: 'reactivate' }),
    onSuccess: refresh,
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Administrador</h3>
        {user.isPlatformAdmin ? (
          self ? (
            <p className="text-sm text-muted">
              Eres administrador. Otro administrador puede quitártelo.
            </p>
          ) : (
            <Button
              variant="secondary"
              className="self-start"
              onClick={() =>
                ask({
                  title: `¿Quitar el permiso de administrador a ${who}?`,
                  body: 'Ya no podrá entrar a este panel.',
                  label: 'Quitar permiso',
                  run: () => setPlatformAdmin(user.id, false),
                })
              }
            >
              Quitar administrador
            </Button>
          )
        ) : (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() =>
              ask({
                title: `¿Hacer administrador a ${who}?`,
                body: 'Podrá ver todos los apicultores y crear y cambiar usuarios, también otros administradores.',
                label: 'Hacer administrador',
                run: () => setPlatformAdmin(user.id, true),
              })
            }
          >
            Hacer administrador
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Cuenta</h3>
        {self ? (
          <p className="text-sm text-muted">Es tu cuenta: no puedes desactivarla.</p>
        ) : user.deactivatedAt ? (
          <>
            <p className="text-sm">
              Desactivada el {formatDate(user.deactivatedAt)}. No puede ingresar.
            </p>
            {reactivate.isError && (
              <p role="alert" className="text-sm text-danger">
                {manageErrorMessage(reactivate.error)}
              </p>
            )}
            <Button
              variant="secondary"
              className="self-start"
              loading={reactivate.isPending}
              onClick={() => reactivate.mutate()}
            >
              Reactivar
            </Button>
          </>
        ) : (
          <Button
            variant="danger"
            className="self-start"
            onClick={() =>
              ask({
                title: `¿Desactivar la cuenta de ${who}?`,
                body: 'No podrá ingresar. Su historial y sus fincas se conservan, y puedes reactivarla cuando quieras.',
                label: 'Desactivar',
                run: () => updateUserAuth(user.id, { action: 'deactivate' }),
              })
            }
          >
            Desactivar
          </Button>
        )}
      </div>
    </div>
  )
}

function UserDetailView({ user, selfId }: { user: UserDetail; selfId: string }) {
  const self = user.id === selfId
  const refresh = useRefreshAccounts()
  const [pending, setPending] = useState<Parameters<Ask>[0] | null>(null)
  const confirmed = useMutation({
    mutationFn: (run: () => Promise<void>) => run(),
    onSuccess: async () => {
      setPending(null)
      await refresh()
    },
  })
  const ask: Ask = (next) => {
    confirmed.reset()
    setPending(next)
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <span className="flex flex-wrap items-center gap-3">
          <h1 className="break-all text-3xl font-bold">{user.email}</h1>
          {user.isPlatformAdmin && (
            <Badge tone="accent" icon={ShieldCheck}>
              Admin
            </Badge>
          )}
          {user.deactivatedAt && <Badge tone="danger">Desactivado</Badge>}
        </span>
        <p className="text-sm text-muted">Alta {formatDate(user.createdAt)}</p>
      </header>
      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Datos</h2>
        <FieldForm
          label="Nombre"
          initial={user.displayName ?? ''}
          validate={nameError}
          save={(value) => setDisplayName(user.id, value)}
        />
        {self ? (
          // Your own password asks for the current one; skipping it here would defeat that.
          <p className="text-sm text-muted">
            Es tu cuenta: tu correo lo cambia otro administrador y tu contraseña se cambia en{' '}
            <Link to="/mi-cuenta" viewTransition className="text-primary hover:underline">
              Mi cuenta
            </Link>
            .
          </p>
        ) : (
          <FieldForm
            label="Correo"
            type="email"
            initial={user.email}
            validate={emailError}
            save={(value) => updateUserAuth(user.id, { action: 'set_email', email: value.trim() })}
          />
        )}
      </Card>
      {!self && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Contraseña</h2>
          <PasswordSection user={user} />
        </Card>
      )}
      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Fincas</h2>
        {user.memberships.length === 0 ? (
          <p className="text-sm text-muted">No pertenece a ninguna finca.</p>
        ) : (
          <ul>
            {user.memberships.map((membership) => (
              <MembershipRow
                key={membership.organizationId}
                user={user}
                membership={membership}
                ask={ask}
              />
            ))}
          </ul>
        )}
        <AddMembership user={user} />
      </Card>
      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Acceso</h2>
        <AccessSection user={user} selfId={selfId} ask={ask} />
      </Card>
      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ''}
        confirmLabel={pending?.label ?? ''}
        pending={confirmed.isPending}
        error={confirmed.isError ? manageErrorMessage(confirmed.error) : null}
        onConfirm={() => pending && confirmed.mutate(pending.run)}
        onCancel={() => setPending(null)}
      >
        {pending?.body && <p>{pending.body}</p>}
      </ConfirmDialog>
    </>
  )
}

export function UserPage() {
  const { id = '' } = useParams()
  const selfId = useSession().session?.user.id ?? ''
  const user = useQuery(userDetailQuery(id))

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[{ label: 'Usuarios', to: '/usuarios' }, { label: user.data?.email ?? 'Usuario' }]}
      />
      {user.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-40" />
        </div>
      ) : user.isError ? (
        <QueryError error={user.error} onRetry={() => user.refetch()} />
      ) : !user.data ? (
        <NotFoundState
          title="Esta cuenta no existe"
          backTo="/usuarios"
          backLabel="Volver a Usuarios"
        />
      ) : (
        // key: a different user resets every form on the page.
        <UserDetailView key={user.data.id} user={user.data} selfId={selfId} />
      )}
    </div>
  )
}
