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
    onSettled: () => navigate('/ingresar', { replace: true }),
  })

  if (loading) return <PageSpinner />
  if (!session) return <Navigate to="/ingresar" replace />

  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-3 text-center">
        <ShieldX size={48} className="text-danger" aria-hidden />
        <p>Esta cuenta no tiene acceso al panel de administración.</p>
        <p className="text-sm text-muted">{session.user.email}</p>
      </div>
      <Button variant="secondary" loading={leave.isPending} onClick={() => leave.mutate()} className="w-full">
        Cerrar sesión
      </Button>
    </AuthLayout>
  )
}
