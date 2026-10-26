import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type SessionState = { session: Session | null; loading: boolean }

/** Current Auth session; onAuthStateChange also delivers the stored one (INITIAL_SESSION) on subscribe. */
export function useSession(): SessionState {
  const queryClient = useQueryClient()
  const [state, setState] = useState<SessionState>({ session: null, loading: true })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Cached rows belong to the previous user.
      if (event === 'SIGNED_OUT') queryClient.clear()
      setState({ session, loading: false })
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  return state
}

export function signOut() {
  return supabase.auth.signOut({ scope: 'local' })
}
