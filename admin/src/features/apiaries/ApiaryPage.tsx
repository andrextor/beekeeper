import { useQuery } from '@tanstack/react-query'
import { Hexagon, MapPin } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { HiveStatusBadge, QueenMark } from '../../components/HiveBadges'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Card } from '../../components/ui/Card'
import { type Column, DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { FactList } from '../../components/ui/FactList'
import { NotFoundState } from '../../components/ui/NotFoundState'
import { ReportTitle } from '../../components/ui/PrintButton'
import { QueryError } from '../../components/ui/QueryError'
import { Segmented } from '../../components/ui/Segmented'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  type Apiary,
  apiaryQuery,
  fetchHives,
  type Hive,
  organizationSummaryQuery,
} from '../../lib/admin-api'
import { formatAltitude, formatColonyAge } from '../../lib/format'
import { hiveTypeLabels, label } from '../../lib/labels'

type Filter = 'activas' | 'todas'

const filters: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'activas', label: 'Activas' },
  { value: 'todas', label: 'Todas' },
]

function boxes(hive: Hive): string {
  return `${hive.brood_boxes ?? '—'} / ${hive.supers ?? '—'}`
}

function age(hive: Hive): string {
  return hive.colony_started_on ? formatColonyAge(hive.colony_started_on) : '—'
}

function hivePath(hive: Hive): string {
  return `/apicultores/${hive.organization_id}/colmenas/${hive.id}`
}

const hiveColumns: ReadonlyArray<Column<Hive>> = [
  {
    header: 'Nombre',
    cell: (hive) => (
      <Link to={hivePath(hive)} viewTransition className="font-medium hover:underline">
        {hive.name}
      </Link>
    ),
  },
  { header: 'Tipo', cell: (hive) => label(hiveTypeLabels, hive.hive_type) },
  { header: 'Estado', cell: (hive) => <HiveStatusBadge hive={hive} /> },
  { header: 'Cámaras / Alzas', cell: boxes },
  { header: 'Reina', cell: (hive) => <QueenMark hive={hive} /> },
  { header: 'Edad', cell: age },
]

function HiveCard({ hive }: { hive: Hive }) {
  return (
    <Link
      to={hivePath(hive)}
      viewTransition
      className="glass flex flex-col gap-2 rounded-card p-4 transition duration-200 hover:-translate-y-0.5"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{hive.name}</span>
        <HiveStatusBadge hive={hive} />
      </span>
      <span className="text-sm text-muted">
        {label(hiveTypeLabels, hive.hive_type)} · Cámaras / Alzas {boxes(hive)} · Edad {age(hive)}
      </span>
      <span className="flex items-center gap-2 text-sm text-muted">
        Reina <QueenMark hive={hive} />
      </span>
    </Link>
  )
}

function Facts({ apiary }: { apiary: Apiary }) {
  const hasMap = apiary.latitude != null && apiary.longitude != null
  const facts = [
    { term: 'Finca', value: apiary.farm_name },
    { term: 'Lugar', value: apiary.place },
    {
      term: 'Altitud',
      value: apiary.altitude_m == null ? null : formatAltitude(apiary.altitude_m),
    },
    { term: 'Flora', value: apiary.flora_notes },
    { term: 'Agua', value: apiary.water_source },
    { term: 'Notas', value: apiary.notes },
  ]
  if (!facts.some((fact) => fact.value) && !hasMap) return null

  return (
    <Card className="flex flex-col gap-4">
      <FactList facts={facts} />
      {hasMap && (
        <a
          href={`https://www.google.com/maps?q=${apiary.latitude},${apiary.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-primary hover:underline"
        >
          <MapPin size={16} aria-hidden /> Ver en el mapa
        </a>
      )}
    </Card>
  )
}

function Hives({ apiaryId }: { apiaryId: string }) {
  const [params, setParams] = useSearchParams()
  const filter: Filter = params.get('estado') === 'todas' ? 'todas' : 'activas'
  const hives = useQuery({
    queryKey: ['admin-hives', apiaryId],
    queryFn: () => fetchHives(apiaryId),
  })
  const rows =
    filter === 'todas' ? hives.data : hives.data?.filter((hive) => hive.status === 'active')

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Colmenas</h2>
        <Segmented
          label="Colmenas"
          options={filters}
          value={filter}
          onChange={(next) =>
            setParams(next === 'todas' ? { estado: next } : {}, { replace: true })
          }
        />
      </div>
      {hives.isError ? (
        <QueryError error={hives.error} onRetry={() => hives.refetch()} />
      ) : (
        <DataTable
          caption="Colmenas"
          columns={hiveColumns}
          rows={rows}
          rowKey={(hive) => hive.id}
          card={(hive) => <HiveCard hive={hive} />}
          rowHref={hivePath}
          empty={
            <EmptyState
              icon={Hexagon}
              title={filter === 'todas' ? 'Aún no hay colmenas' : 'Sin colmenas activas'}
            />
          }
        />
      )}
    </section>
  )
}

export function ApiaryPage() {
  const { id = '', apiaryId = '' } = useParams()
  const organization = useQuery(organizationSummaryQuery(id))
  const apiary = useQuery(apiaryQuery(apiaryId))
  const organizationName = organization.data?.organization.name ?? 'Apicultor'
  const found = apiary.data && apiary.data.organization_id === id ? apiary.data : null

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Apicultores', to: '/apicultores' },
          { label: organizationName, to: `/apicultores/${id}` },
          { label: found?.name ?? 'Apiario' },
        ]}
      />
      {organization.isError ? (
        // The summary RPC is the admin check here: RLS alone would answer a demoted admin with "not found".
        <QueryError error={organization.error} onRetry={() => organization.refetch()} />
      ) : apiary.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-40" />
        </div>
      ) : apiary.isError ? (
        <QueryError error={apiary.error} onRetry={() => apiary.refetch()} />
      ) : !found ? (
        <NotFoundState
          title="Este apiario no existe"
          backTo={`/apicultores/${id}`}
          backLabel={`Volver a ${organizationName}`}
        />
      ) : (
        <>
          <ReportTitle>
            <h1 className="text-3xl font-bold">{found.name}</h1>
          </ReportTitle>
          <Facts apiary={found} />
          <Hives apiaryId={found.id} />
        </>
      )}
    </div>
  )
}
