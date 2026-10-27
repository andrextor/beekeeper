import { LayoutDashboard, type LucideIcon, UserRound, Users } from 'lucide-react'

export const navigation: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/apicultores', label: 'Apicultores', icon: Users },
  { to: '/usuarios', label: 'Usuarios', icon: UserRound },
]

/** The public user manual (`admin/manual.html`, no login); it opens in a new tab. */
export const manualUrl = '/manual.html'
