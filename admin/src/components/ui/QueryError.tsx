import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate } from 'react-router'
import { isNotPlatformAdmin } from '../../lib/admin-api'
import { ErrorState } from './ErrorState'

export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const queryClient = useQueryClient()
  const refused = isNotPlatformAdmin(error)

  // The cached profile still says admin; drop it so RequireAdmin asks again.
  useEffect(() => {
    if (refused) queryClient.removeQueries({ queryKey: ['own-profile'] })
  }, [refused, queryClient])

  if (refused) return <Navigate to="/sin-acceso" replace />
  return <ErrorState onRetry={onRetry} />
}
