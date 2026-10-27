import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Eye, EyeOff, KeyRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { SectionCard } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { QueryError } from '../../components/ui/QueryError'
import { Skeleton } from '../../components/ui/Skeleton'
import { nameError, passwordError } from '../../lib/create-user'
import {
  changeOwnPassword,
  manageErrorMessage,
  updateOwnName,
  useRefreshAccounts,
  userDetailQuery,
} from '../../lib/manage-user'
import { useSession } from '../../lib/session'

function NameForm({ userId, email, initial }: { userId: string; email: string; initial: string }) {
  const refresh = useRefreshAccounts()
  const [name, setName] = useState(initial)
  const [invalid, setInvalid] = useState<string>()
  const save = useMutation({
    mutationFn: (value: string) => updateOwnName(userId, value),
    onSuccess: refresh,
  })
  const dirty = name.trim() !== initial
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = nameError(name)
    setInvalid(found)
    if (!found) save.mutate(name)
  }
  return (
    <form onSubmit={submit} noValidate>
      <SectionCard
        title="Datos"
        footer={
          <>
            {save.isSuccess && !dirty && (
              <span className="mr-auto flex items-center gap-1.5 text-sm text-muted">
                <Check size={16} className="text-primary" aria-hidden />
                Cambios guardados.
              </span>
            )}
            <Button
              variant="ghost"
              disabled={!dirty || save.isPending}
              onClick={() => {
                setName(initial)
                setInvalid(undefined)
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
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              save.reset()
            }}
            error={invalid ?? (save.isError ? manageErrorMessage(save.error) : undefined)}
          />
          <Input
            label="Correo"
            value={email}
            disabled
            readOnly
            hint="Otro administrador puede cambiarlo."
          />
        </div>
      </SectionCard>
    </form>
  )
}

const emptyPasswords = { current: '', next: '', repeat: '' }

function PasswordForm({ email }: { email: string }) {
  const [fields, setFields] = useState(emptyPasswords)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyPasswords, string>>>({})
  const change = useMutation({
    mutationFn: () => changeOwnPassword(email, fields.current, fields.next),
    onSuccess: () => {
      setFields(emptyPasswords)
      setOpen(false)
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = {
      current: fields.current ? undefined : 'Escribe tu contraseña actual.',
      next: passwordError(fields.next),
      repeat: fields.repeat === fields.next ? undefined : 'Las contraseñas no coinciden.',
    }
    setErrors(found)
    if (!found.current && !found.next && !found.repeat) change.mutate()
  }

  const field = (key: keyof typeof emptyPasswords, label: string, autoComplete: string) => (
    <Input
      label={label}
      type={shown ? 'text' : 'password'}
      autoComplete={autoComplete}
      value={fields[key]}
      onChange={(event) => {
        setFields((current) => ({ ...current, [key]: event.target.value }))
        change.reset()
      }}
      error={errors[key]}
    />
  )

  const start = () => {
    setFields(emptyPasswords)
    setErrors({})
    change.reset()
    setOpen(true)
  }
  const close = () => {
    setFields(emptyPasswords)
    setOpen(false)
  }

  return (
    <>
      <SectionCard
        title="Contraseña"
        description={
          change.isSuccess ? (
            <span className="flex items-center gap-1.5">
              <Check size={16} className="text-primary" aria-hidden />
              Contraseña cambiada.
            </span>
          ) : (
            'Te pedimos la actual antes de cambiarla.'
          )
        }
        footer={
          <Button variant="secondary" onClick={start}>
            <KeyRound size={16} aria-hidden />
            Cambiar contraseña
          </Button>
        }
      />
      <Dialog
        open={open}
        title="Cambiar contraseña"
        busy={change.isPending}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={change.isPending}>
              Cancelar
            </Button>
            <Button type="submit" form="own-password-form" loading={change.isPending}>
              Cambiar contraseña
            </Button>
          </>
        }
      >
        <form id="own-password-form" onSubmit={submit} noValidate className="flex flex-col gap-3">
          {field('current', 'Contraseña actual', 'current-password')}
          {field('next', 'Contraseña nueva', 'new-password')}
          {field('repeat', 'Repite la contraseña nueva', 'new-password')}
          <span className="flex items-center gap-2 text-sm text-muted">
            <IconButton
              icon={shown ? EyeOff : Eye}
              label={shown ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
              onClick={() => setShown((current) => !current)}
            />
            {shown ? 'Ocultar' : 'Mostrar'}
          </span>
          {change.isError && (
            <p role="alert" className="text-sm text-danger">
              {manageErrorMessage(change.error)}
            </p>
          )}
        </form>
      </Dialog>
    </>
  )
}

export function AccountPage() {
  const session = useSession().session
  const userId = session?.user.id ?? ''
  const profile = useQuery({ ...userDetailQuery(userId), enabled: userId !== '' })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
      {profile.isError ? (
        <QueryError error={profile.error} onRetry={() => profile.refetch()} />
      ) : !profile.data ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <NameForm
            userId={userId}
            email={profile.data.email}
            initial={profile.data.displayName ?? ''}
          />
          <PasswordForm email={profile.data.email} />
        </>
      )}
    </div>
  )
}
