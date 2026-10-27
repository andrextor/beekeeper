import { LayoutDashboard, type LucideIcon, UserRound, Users } from 'lucide-react'

export const navigation: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/apicultores', label: 'Apicultores', icon: Users },
  { to: '/usuarios', label: 'Usuarios', icon: UserRound },
]

/** The public user manual (shared from claude.ai); it opens in a new tab. */
export const manualUrl = 'https://claude.ai/artifact/AKniKcv6fAZF9S6BQgMUx5'
