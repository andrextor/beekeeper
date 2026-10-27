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
    <AuthLayout
      title="Sin acceso al panel"
      description="Este panel es solo para administradores de Landak Apiario."
    >
      <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-xs">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
          <ShieldX size={20} aria-hidden />
        </span>
        <p className="min-w-0 text-sm">
          <span className="block font-medium break-all">{session.user.email}</span>
          <span className="text-muted">no tiene permiso de administrador.</span>
        </p>
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
