import { useMutation, useQuery } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
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

function NameForm({ userId, initial }: { userId: string; initial: string }) {
  const refresh = useRefreshAccounts()
  const [name, setName] = useState(initial)
  const [invalid, setInvalid] = useState<string>()
  const save = useMutation({
    mutationFn: (value: string) => updateOwnName(userId, value),
    onSuccess: refresh,
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = nameError(name)
    setInvalid(found)
    if (!found) save.mutate(name)
  }
  return (
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-3">
      <Input
        label="Nombre"
        autoComplete="name"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          save.reset()
        }}
        error={invalid ?? (save.isError ? manageErrorMessage(save.error) : undefined)}
        hint={save.isSuccess ? 'Guardado.' : undefined}
      />
      <Button type="submit" variant="secondary" loading={save.isPending} className="self-start">
        Guardar
      </Button>
    </form>
  )
}

const emptyPasswords = { current: '', next: '', repeat: '' }

function PasswordForm({ email }: { email: string }) {
  const [fields, setFields] = useState(emptyPasswords)
  const [shown, setShown] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyPasswords, string>>>({})
  const change = useMutation({
    mutationFn: () => changeOwnPassword(email, fields.current, fields.next),
    onSuccess: () => setFields(emptyPasswords),
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

  return (
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-3">
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
      {change.isSuccess && <p className="text-sm">Contraseña cambiada.</p>}
      <Button type="submit" loading={change.isPending} className="self-start">
        Cambiar contraseña
      </Button>
    </form>
  )
}

export function AccountPage() {
  const session = useSession().session
  const userId = session?.user.id ?? ''
  const profile = useQuery({ ...userDetailQuery(userId), enabled: userId !== '' })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Mi cuenta</h1>
      {profile.isError ? (
        <QueryError error={profile.error} onRetry={() => profile.refetch()} />
      ) : !profile.data ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <Card className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Datos</h2>
            <p className="text-sm text-muted">
              Correo <span className="text-text">{profile.data.email}</span>. Otro administrador
              puede cambiarlo.
            </p>
            <NameForm userId={userId} initial={profile.data.displayName ?? ''} />
          </Card>
          <Card className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Contraseña</h2>
            <PasswordForm email={profile.data.email} />
          </Card>
        </>
      )}
    </div>
  )
}
