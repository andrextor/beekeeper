import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useOwnProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['own-profile', userId],
    enabled: userId !== undefined,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      if (!userId) throw new Error('No session')
      const { data, error } = await supabase
        .from('profiles')
        .select('email, is_platform_admin')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
  })
}
