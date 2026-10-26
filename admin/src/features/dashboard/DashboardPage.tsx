import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Camera,
  ChevronRight,
  ClipboardCheck,
  Hexagon,
  type LucideIcon,
  MapPin,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { QueryError } from '../../components/ui/QueryError'
import { Skeleton } from '../../components/ui/Skeleton'
import { type AdminStats, fetchOrganizations, fetchStats } from '../../lib/admin-api'
import { formatNumber, formatRelative } from '../../lib/format'
import { StorageCard } from './StorageCard'

const staleTime = 60_000

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted">
        <Icon size={20} aria-hidden />
        <span className="text-sm">{label}</span>
      </div>
      <p className="font-display text-4xl font-bold tabular-nums">{value}</p>
    </Card>
  )
}

function statCards(stats: AdminStats) {
  return [
    { icon: Users, label: 'Apicultores', value: formatNumber(stats.organizations) },
    { icon: UserRound, label: 'Usuarios', value: formatNumber(stats.users) },
    { icon: UserCheck, label: 'Revisores', value: formatNumber(stats.reviewers) },
    { icon: MapPin, label: 'Apiarios', value: formatNumber(stats.apiaries) },
    {
      icon: Hexagon,
      label: 'Colmenas activas',
      value: `${formatNumber(stats.hives_active)} de ${formatNumber(stats.hives_total)}`,
    },
    {
      icon: ClipboardCheck,
      label: 'Revisiones · 30 días',
      value: formatNumber(stats.inspections_30d),
    },
    { icon: Activity, label: 'Eventos · 30 días', value: formatNumber(stats.events_30d) },
    { icon: Camera, label: 'Fotos', value: formatNumber(stats.photos) },
  ]
}

function RecentActivity() {
  const recent = useQuery({
    queryKey: ['admin-orgs-recent'],
    queryFn: () => fetchOrganizations('', 1, 5),
    staleTime,
  })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Actividad reciente</h2>
        <Link
          to="/apicultores"
          viewTransition
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver todos <ChevronRight size={16} aria-hidden />
        </Link>
      </div>
      <Card className="p-0 md:p-0">
        {recent.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-11" />
            ))}
          </div>
        ) : recent.isError ? (
          <QueryError error={recent.error} onRetry={() => recent.refetch()} />
        ) : recent.data.rows.length === 0 ? (
          <EmptyState icon={Users} title="Aún no hay apicultores" />
        ) : (
          <ul className="stagger">
            {recent.data.rows.map((organization) => (
              <li key={organization.id} className="border-b border-glass-border last:border-0">
                <Link
                  to={`/apicultores/${organization.id}`}
                  viewTransition
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-glass-field md:px-6"
                >
                  <span className="font-medium">{organization.name}</span>
                  <span className="text-right text-sm text-muted">
                    {organization.last_inspection_at
                      ? `Última revisión ${formatRelative(organization.last_inspection_at)}`
                      : 'Sin revisiones'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

export function DashboardPage() {
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: fetchStats, staleTime })

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Resumen</h1>
      {stats.isPending ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : stats.isError ? (
        <QueryError error={stats.error} onRetry={() => stats.refetch()} />
      ) : (
        <>
          <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards(stats.data).map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
          <StorageCard bytes={stats.data.storage_bytes} />
        </>
      )}
      <RecentActivity />
    </div>
  )
}
