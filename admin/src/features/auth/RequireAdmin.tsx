import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageSpinner } from '../../components/ui/PageSpinner'
import { useSession } from '../../lib/session'
import { useOwnProfile } from './useOwnProfile'

/** A clear message for non-admins, not the security boundary: RLS and the admin RPCs refuse them anyway. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  const location = useLocation()
  const profile = useOwnProfile(session?.user.id)

  if (loading) return <PageSpinner />
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/ingresar?next=${next}`} replace />
  }
  if (profile.isPending) return <PageSpinner />
  if (profile.isError) return <ErrorState onRetry={() => profile.refetch()} />
  if (!profile.data.is_platform_admin) return <Navigate to="/sin-acceso" replace />
  return children
}
