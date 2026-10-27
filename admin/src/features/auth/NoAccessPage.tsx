import { useMutation } from '@tanstack/react-query'
import { ShieldX } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/PageSpinner'
import { signOut, useSession } from '../../lib/session'
import { AuthLayout } from './AuthLayout'

export function NoAccessPage() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const leave = useMutation({
    mutationFn: signOut,
    onSettled: () => navigate('/ingresar', { replace: true, viewTransition: true }),
  })

  if (loading) return <PageSpinner />
  if (!session) return <Navigate to="/ingresar" replace />

  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <ShieldX size={22} aria-hidden />
        </span>
        <p>Esta cuenta no tiene acceso al panel de administración.</p>
        <p className="text-sm text-muted">{session.user.email}</p>
      </div>
      <Button
        variant="secondary"
        loading={leave.isPending}
        onClick={() => leave.mutate()}
        className="w-full"
      >
        Cerrar sesión
      </Button>
    </AuthLayout>
  )
}
