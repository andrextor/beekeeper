import { Navigate } from 'react-router'
import { isNotPlatformAdmin } from '../../lib/admin-api'
import { ErrorState } from './ErrorState'

export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (isNotPlatformAdmin(error)) return <Navigate to="/sin-acceso" replace />
  return <ErrorState onRetry={onRetry} />
}
