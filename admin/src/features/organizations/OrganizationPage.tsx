import { useQuery } from '@tanstack/react-query'
import { MapPin, UserRound } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Card, cardClass } from '../../components/ui/Card'
import { type Column, DataTable, MobileCard } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { NotFoundState } from '../../components/ui/NotFoundState'
import { ReportTitle } from '../../components/ui/PrintButton'
import { QueryError } from '../../components/ui/QueryError'
import { Segmented } from '../../components/ui/Segmented'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  type ApiarySummary,
  type Member,
  type OrganizationSummary,
  organizationSummaryQuery,
  type PendingInvite,
} from '../../lib/admin-api'
import { cx } from '../../lib/cx'
import { formatDate, formatLastInspection, formatNumber } from '../../lib/format'
import { roleLabels, roleTones } from '../../lib/labels'

type Tab = 'apiarios' | 'personas'

const tabs: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'apiarios', label: 'Apiarios' },
  { value: 'personas', label: 'Personas' },
]

function RoleBadge({ role }: { role: Member['role'] }) {
  return <Badge tone={roleTones[role]}>{roleLabels[role]}</Badge>
}

function MemberEmail({ row }: { row: Member }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link to={`/usuarios/${row.user_id}`} viewTransition className="font-medium hover:underline">
        {row.email}
      </Link>
      {row.deactivated_at && <Badge tone="danger">Desactivado</Badge>}
    </span>
  )
}

const memberColumns: ReadonlyArray<Column<Member>> = [
  { header: 'Correo', cell: (row) => <MemberEmail row={row} /> },
  { header: 'Nombre', cell: (row) => row.display_name ?? '—' },
  { header: 'Rol', cell: (row) => <RoleBadge role={row.role} /> },
  { header: 'Desde', cell: (row) => formatDate(row.joined_at) },
]

const inviteColumns: ReadonlyArray<Column<PendingInvite>> = [
  { header: 'Etiqueta', cell: (row) => row.label ?? '—' },
  { header: 'Rol', cell: (row) => <RoleBadge role={row.role} /> },
  { header: 'Creada', cell: (row) => formatDate(row.created_at) },
  { header: 'Vence', cell: (row) => formatDate(row.expires_at) },
]

function MemberCard({ row }: { row: Member }) {
  return (
    <MobileCard>
      <span className="flex flex-wrap items-center gap-2">
        <MemberEmail row={row} />
        <RoleBadge role={row.role} />
      </span>
      {row.display_name && <span className="text-sm text-muted">{row.display_name}</span>}
      <span className="text-xs text-muted">Desde {formatDate(row.joined_at)}</span>
    </MobileCard>
  )
}

function InviteCard({ row }: { row: PendingInvite }) {
  return (
    <MobileCard>
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.label ?? 'Sin etiqueta'}</span>
        <RoleBadge role={row.role} />
      </span>
      <span className="text-xs text-muted">
        Creada {formatDate(row.created_at)} · Vence {formatDate(row.expires_at)}
      </span>
    </MobileCard>
  )
}

function People({ summary }: { summary: OrganizationSummary }) {
  return (
    <div className="flex flex-col gap-6">
      <DataTable
        caption="Personas"
        columns={memberColumns}
        rows={summary.members}
        rowKey={(row) => row.user_id}
        card={(row) => <MemberCard row={row} />}
        empty={<EmptyState icon={UserRound} title="Sin personas" />}
      />
      {summary.pending_invites.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Invitaciones pendientes</h2>
          <DataTable
            caption="Invitaciones pendientes"
            columns={inviteColumns}
            rows={summary.pending_invites}
            rowKey={(row) => row.id}
            card={(row) => <InviteCard row={row} />}
            empty={null}
          />
        </section>
      )}
    </div>
  )
}

function ApiaryCard({ organizationId, apiary }: { organizationId: string; apiary: ApiarySummary }) {
  return (
    <Link
      to={`/apicultores/${organizationId}/apiarios/${apiary.id}`}
      viewTransition
      className={cx(
        cardClass,
        'flex h-full flex-col gap-1 p-5 transition-colors hover:border-primary/40 hover:bg-muted-surface',
      )}
    >
      <span className="font-display text-lg font-semibold">{apiary.name}</span>
      <span className="text-sm">
        {formatNumber(apiary.hives_active)} de {formatNumber(apiary.hives_total)} activas
      </span>
      <span className="text-sm text-muted">{formatLastInspection(apiary.last_inspection_at)}</span>
    </Link>
  )
}

function Apiaries({ summary }: { summary: OrganizationSummary }) {
  if (summary.apiaries.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={MapPin}
          title="Aún no hay apiarios"
          hint="El apicultor los crea desde la app."
        />
      </Card>
    )
  }
  return (
    <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summary.apiaries.map((apiary) => (
        <li key={apiary.id}>
          <ApiaryCard organizationId={summary.organization.id} apiary={apiary} />
        </li>
      ))}
    </ul>
  )
}

function Header({ summary }: { summary: OrganizationSummary }) {
  const { organization, apiaries, members } = summary
  const active = apiaries.reduce((sum, apiary) => sum + apiary.hives_active, 0)
  const total = apiaries.reduce((sum, apiary) => sum + apiary.hives_total, 0)
  const facts = [
    `Alta ${formatDate(organization.created_at)}`,
    `${formatNumber(apiaries.length)} ${apiaries.length === 1 ? 'apiario' : 'apiarios'}`,
    `${formatNumber(active)} de ${formatNumber(total)} colmenas activas`,
    `${formatNumber(members.length)} ${members.length === 1 ? 'persona' : 'personas'}`,
  ]
  return (
    <header className="flex flex-col gap-2">
      <ReportTitle>
        <span className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{organization.name}</h1>
          {organization.deleted_at && <Badge tone="danger">Eliminado</Badge>}
        </span>
      </ReportTitle>
      <p className="text-sm text-muted">{facts.join(' · ')}</p>
    </header>
  )
}

export function OrganizationPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'personas' ? 'personas' : 'apiarios'
  const summary = useQuery(organizationSummaryQuery(id))

  function setTab(next: Tab) {
    setParams(next === 'personas' ? { tab: next } : {}, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Apicultores', to: '/apicultores' },
          { label: summary.data?.organization.name ?? 'Apicultor' },
        ]}
      />
      {summary.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        </div>
      ) : summary.isError ? (
        <QueryError error={summary.error} onRetry={() => summary.refetch()} />
      ) : !summary.data ? (
        <NotFoundState
          title="Este apicultor no existe"
          backTo="/apicultores"
          backLabel="Volver a Apicultores"
        />
      ) : (
        <>
          <Header summary={summary.data} />
          <Segmented label="Vista" options={tabs} value={tab} onChange={setTab} />
          {tab === 'personas' ? (
            <People summary={summary.data} />
          ) : (
            <Apiaries summary={summary.data} />
          )}
        </>
      )}
    </div>
  )
}
