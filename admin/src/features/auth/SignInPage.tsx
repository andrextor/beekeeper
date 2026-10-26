import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/PageSpinner'
import { authErrorMessage, safeNextPath } from '../../lib/auth'
import { useSession } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import { AuthLayout } from './AuthLayout'

export function SignInPage() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const signIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
    },
    onSuccess: () => navigate(next, { replace: true }),
  })

  if (loading) return <PageSpinner />
  // RequireAdmin sends a signed-in user without the flag on to /sin-acceso.
  if (session && !signIn.isPending) return <Navigate to={next} replace />

  const submit = (event: FormEvent) => {
    event.preventDefault()
    signIn.mutate()
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Correo"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          trailing={
            <IconButton
              icon={showPassword ? EyeOff : Eye}
              label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((shown) => !shown)}
            />
          }
        />
        {signIn.isError && (
          <p role="alert" className="text-sm text-danger">
            {authErrorMessage(signIn.error)}
          </p>
        )}
        <Button type="submit" loading={signIn.isPending} className="w-full">
          Ingresar
        </Button>
      </form>
    </AuthLayout>
  )
}
