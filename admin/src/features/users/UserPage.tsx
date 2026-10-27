import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, KeyRound, Plus, ShieldCheck } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { SectionCard } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { NotFoundState } from '../../components/ui/NotFoundState'
import { QueryError } from '../../components/ui/QueryError'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import type { FarmOption, Role } from '../../lib/admin-api'
import { emailError, nameError, passwordError } from '../../lib/create-user'
import { formatDate } from '../../lib/format'
import { roleLabels, roleTones } from '../../lib/labels'
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
  { value: 'owner', label: roleLabels.owner },
  { value: 'reviewer', label: roleLabels.reviewer },
  { value: 'viewer', label: roleLabels.viewer },
]

const roleHints: Readonly<Record<Role, string>> = {
  owner: 'Podrá cambiar todo en la finca, también las personas y sus roles.',
  reviewer: 'Podrá hacer revisiones, notas, fotos y actividades.',
  viewer: 'Verá colmenas, revisiones, visitas y fotos, sin poder cambiar nada.',
}

type DetailErrors = { name?: string; email?: string }

/** Name and email in one form: one save that sends only what changed. */
function DetailsForm({ user, self }: { user: UserDetail; self: boolean }) {
  const refresh = useRefreshAccounts()
  const initial = { name: user.displayName ?? '', email: user.email }
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<DetailErrors>({})
  const nameChanged = values.name.trim() !== initial.name
  // Auth stores emails lowercased; compare the same way so a saved email is not still "changed".
  const emailChanged = !self && values.email.trim().toLowerCase() !== initial.email.toLowerCase()

  const save = useMutation({
    mutationFn: async () => {
      const failed: DetailErrors = {}
      if (nameChanged) {
        await setDisplayName(user.id, values.name).catch((error: unknown) => {
          failed.name = manageErrorMessage(error)
        })
      }
      if (emailChanged) {
        await updateUserAuth(user.id, { action: 'set_email', email: values.email.trim() }).catch(
          (error: unknown) => {
            failed.email = manageErrorMessage(error)
          },
        )
      }
      return failed
    },
    onSuccess: async (failed) => {
      setErrors(failed)
      await refresh()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found: DetailErrors = {
      name: nameChanged ? nameError(values.name) : undefined,
      email: emailChanged ? emailError(values.email) : undefined,
    }
    setErrors(found)
    if (!found.name && !found.email) save.mutate()
  }

  const set = (field: keyof typeof initial) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    save.reset()
  }
  const dirty = nameChanged || emailChanged
  const saved = save.isSuccess && !save.data.name && !save.data.email && !dirty

  return (
    <form onSubmit={submit} noValidate>
      <SectionCard
        title="Datos"
        footer={
          <>
            {saved && (
              <span className="mr-auto flex items-center gap-1.5 text-sm text-muted">
                <Check size={16} className="text-primary" aria-hidden />
                Cambios guardados.
              </span>
            )}
            <Button
              variant="ghost"
              disabled={!dirty || save.isPending}
              onClick={() => {
                setValues(initial)
                setErrors({})
                save.reset()
              }}
            >
              Descartar
            </Button>
            <Button type="submit" disabled={!dirty} loading={save.isPending}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nombre"
            autoComplete="off"
            value={values.name}
            onChange={(event) => set('name')(event.target.value)}
            error={errors.name}
          />
          {self ? (
            <Input label="Correo" value={user.email} disabled readOnly />
          ) : (
            <Input
              label="Correo"
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={(event) => set('email')(event.target.value)}
              error={errors.email}
            />
          )}
        </div>
        {self && (
          // Your own password asks for the current one; skipping it here would defeat that.
          <p className="text-sm text-muted">
            Es tu cuenta: tu correo lo cambia otro administrador y tu contraseña se cambia en{' '}
            <Link
              to="/mi-cuenta"
              viewTransition
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Mi cuenta
            </Link>
            .
          </p>
        )}
      </SectionCard>
    </form>
  )
}

function PasswordDialog({
  user,
  open,
  onClose,
}: {
  user: UserDetail
  open: boolean
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [invalid, setInvalid] = useState<string>()
  const change = useMutation({
    mutationFn: (next: string) =>
      updateUserAuth(user.id, { action: 'set_password', password: next }),
  })

  const close = () => {
    setPassword('')
    setInvalid(undefined)
    change.reset()
    onClose()
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = passwordError(password)
    setInvalid(found)
    if (!found) change.mutate(password)
  }

  return (
    <Dialog
      open={open}
      title="Cambiar contraseña"
      busy={change.isPending}
      onClose={close}
      footer={
        change.isSuccess ? (
          <Button onClick={close}>Listo</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={change.isPending}>
              Cancelar
            </Button>
            <Button type="submit" form="password-form" loading={change.isPending}>
              Cambiar contraseña
            </Button>
          </>
        )
      }
    >
      {change.isSuccess ? (
        <>
          <CopyField label="Contraseña nueva" value={change.variables} />
          <p className="rounded-control bg-warning-bg p-3 text-sm">
            Compártela por un canal privado. No se vuelve a mostrar. Si tenía la sesión abierta en
            otro equipo, sigue abierta hasta que venza.
          </p>
        </>
      ) : (
        <form id="password-form" onSubmit={submit} noValidate className="flex flex-col gap-3">
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
        </form>
      )}
    </Dialog>
  )
}

function PasswordSection({ user }: { user: UserDetail }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <SectionCard
        title="Contraseña"
        description="Crea una contraseña nueva y compártela con la persona."
        footer={
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <KeyRound size={16} aria-hidden />
            Cambiar contraseña
          </Button>
        }
      />
      <PasswordDialog user={user} open={open} onClose={() => setOpen(false)} />
    </>
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
  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Link
            to={`/apicultores/${membership.organizationId}`}
            viewTransition
            className="font-medium hover:underline"
          >
            {membership.name}
          </Link>
          <Badge tone={roleTones[membership.role]}>{roleLabels[membership.role]}</Badge>
          {membership.deletedAt && <Badge tone="danger">Eliminado</Badge>}
        </span>
        <span className="text-xs text-muted">Desde {formatDate(membership.since)}</span>
      </span>
      {!membership.deletedAt && (
        <span className="flex flex-wrap items-center gap-2">
          <Select
            label={`Rol en ${membership.name}`}
            hideLabel
            options={roles}
            value={membership.role}
            onChange={(next) =>
              ask({
                title: `¿Hacer a ${who} ${roleLabels[next].toLowerCase()} de ${membership.name}?`,
                body: roleHints[next],
                label: 'Cambiar rol',
                run: () => setMemberRole(membership.organizationId, user.id, next),
              })
            }
            className="w-40"
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
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

function AddMembershipDialog({
  user,
  open,
  onClose,
}: {
  user: UserDetail
  open: boolean
  onClose: () => void
}) {
  const refresh = useRefreshAccounts()
  const [farm, setFarm] = useState<FarmOption | null>(null)
  const [role, setRole] = useState<Role>('reviewer')
  const [missing, setMissing] = useState(false)
  const close = () => {
    setFarm(null)
    setRole('reviewer')
    setMissing(false)
    add.reset()
    onClose()
  }
  const add = useMutation({
    mutationFn: (target: FarmOption) => addMember(target.id, user.id, role),
    onSuccess: async () => {
      await refresh()
      close()
    },
  })

  return (
    <Dialog
      open={open}
      title="Agregar a una finca"
      busy={add.isPending}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={add.isPending}>
            Cancelar
          </Button>
          <Button
            loading={add.isPending}
            onClick={() => {
              setMissing(farm === null)
              if (farm) add.mutate(farm)
            }}
          >
            Agregar
          </Button>
        </>
      }
    >
      <FarmPicker
        value={farm}
        onChange={(next) => {
          setFarm(next)
          setMissing(false)
          add.reset()
        }}
        error={missing ? 'Elige una finca.' : undefined}
        exclude={user.memberships.map((membership) => membership.organizationId)}
      />
      <Select label="Rol" options={roles} value={role} onChange={setRole} hint={roleHints[role]} />
      {add.isError && (
        <p role="alert" className="text-sm text-danger">
          {manageErrorMessage(add.error)}
        </p>
      )}
    </Dialog>
  )
}

function MembershipsSection({ user, ask }: { user: UserDetail; ask: Ask }) {
  const [adding, setAdding] = useState(false)
  return (
    <SectionCard
      title="Fincas"
      description="Dónde participa y con qué rol."
      footer={
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={16} aria-hidden />
          Agregar a una finca
        </Button>
      }
    >
      {user.memberships.length === 0 ? (
        <p className="text-sm text-muted">No pertenece a ninguna finca.</p>
      ) : (
        <ul className="divide-y divide-border">
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
      <AddMembershipDialog user={user} open={adding} onClose={() => setAdding(false)} />
    </SectionCard>
  )
}

function AccessRow({
  title,
  description,
  children,
}: {
  title: string
  description: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="text-sm text-muted">{description}</div>
      </div>
      {children && <div className="flex shrink-0 flex-col gap-2 md:items-end">{children}</div>}
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
    <SectionCard title="Acceso">
      <div className="divide-y divide-border">
        <AccessRow
          title="Administrador"
          description={
            user.isPlatformAdmin
              ? self
                ? 'Eres administrador. Otro administrador puede quitártelo.'
                : 'Puede ver todos los apicultores y crear y cambiar usuarios.'
              : 'No entra a este panel.'
          }
        >
          {!self &&
            (user.isPlatformAdmin ? (
              <Button
                variant="secondary"
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
            ) : (
              <Button
                variant="secondary"
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
            ))}
        </AccessRow>
        <AccessRow
          title="Cuenta"
          description={
            self
              ? 'Es tu cuenta: no puedes desactivarla.'
              : user.deactivatedAt
                ? `Desactivada el ${formatDate(user.deactivatedAt)}. No puede ingresar.`
                : 'Activa. Al desactivarla no podrá ingresar; su historial se conserva.'
          }
        >
          {!self &&
            (user.deactivatedAt ? (
              <>
                <Button
                  variant="secondary"
                  loading={reactivate.isPending}
                  onClick={() => reactivate.mutate()}
                >
                  Reactivar
                </Button>
                {reactivate.isError && (
                  <p role="alert" className="text-sm text-danger">
                    {manageErrorMessage(reactivate.error)}
                  </p>
                )}
              </>
            ) : (
              <Button
                variant="danger"
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
            ))}
        </AccessRow>
      </div>
    </SectionCard>
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
          <h1 className="break-all text-2xl font-bold tracking-tight">{user.email}</h1>
          {user.isPlatformAdmin && (
            <Badge tone="accent" icon={ShieldCheck}>
              Admin
            </Badge>
          )}
          {user.deactivatedAt && <Badge tone="danger">Desactivado</Badge>}
        </span>
        <p className="text-sm text-muted">Alta {formatDate(user.createdAt)}</p>
      </header>
      <DetailsForm user={user} self={self} />
      {!self && <PasswordSection user={user} />}
      <MembershipsSection user={user} ask={ask} />
      <AccessSection user={user} selfId={selfId} ask={ask} />
      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ''}
        confirmLabel={pending?.label ?? ''}
        pending={confirmed.isPending}
        error={confirmed.isError ? manageErrorMessage(confirmed.error) : null}
        onConfirm={() => pending && confirmed.mutate(pending.run)}
        onCancel={() => setPending(null)}
      >
        {pending?.body}
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
