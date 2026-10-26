import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { SearchX, Users } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { type Column, DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { QueryError } from '../../components/ui/QueryError'
import { SearchInput } from '../../components/ui/SearchInput'
import { fetchOrganizations, type OrganizationRow, pageCount } from '../../lib/admin-api'
import { formatDate, formatNumber, formatRelative } from '../../lib/format'
import { useListParams } from '../../lib/useListParams'

function lastInspection(row: OrganizationRow): string {
  return row.last_inspection_at ? formatRelative(row.last_inspection_at) : 'Sin revisiones'
}

function owners(row: OrganizationRow): string {
  return row.owner_emails.join(', ') || '—'
}

function Name({ row }: { row: OrganizationRow }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link
        to={`/apicultores/${row.id}`}
        viewTransition
        className="font-medium hover:underline md:after:absolute md:after:inset-0"
      >
        {row.name}
      </Link>
      {row.deleted_at && <Badge tone="danger">Eliminado</Badge>}
    </span>
  )
}

const columns: ReadonlyArray<Column<OrganizationRow>> = [
  { header: 'Organización', cell: (row) => <Name row={row} /> },
  { header: 'Propietario(s)', cell: owners },
  { header: 'Miembros', cell: (row) => formatNumber(row.members), className: 'text-right' },
  { header: 'Apiarios', cell: (row) => formatNumber(row.apiaries), className: 'text-right' },
  {
    header: 'Colmenas activas',
    cell: (row) => formatNumber(row.hives_active),
    className: 'text-right',
  },
  {
    header: 'Revisiones 30 d',
    cell: (row) => formatNumber(row.inspections_30d),
    className: 'text-right',
  },
  { header: 'Última revisión', cell: lastInspection },
  { header: 'Creada', cell: (row) => formatDate(row.created_at) },
]

function OrganizationCard({ row }: { row: OrganizationRow }) {
  const hives = `${formatNumber(row.hives_active)} ${row.hives_active === 1 ? 'colmena' : 'colmenas'}`
  return (
    <Link
      to={`/apicultores/${row.id}`}
      viewTransition
      className="glass flex flex-col gap-1 rounded-card p-4 transition duration-200 hover:-translate-y-0.5"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.name}</span>
        {row.deleted_at && <Badge tone="danger">Eliminado</Badge>}
      </span>
      <span className="truncate text-sm text-muted">{owners(row)}</span>
      <span className="text-sm">
        {hives} ·{' '}
        {row.last_inspection_at ? `última revisión ${lastInspection(row)}` : 'sin revisiones'}
      </span>
    </Link>
  )
}

export function OrganizationsPage() {
  const { q, page, setQuery, setPage } = useListParams()
  const list = useQuery({
    queryKey: ['admin-orgs', q, page],
    queryFn: () => fetchOrganizations(q, page),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Apicultores</h1>
      <SearchInput
        label="Buscar"
        placeholder="Nombre o correo del propietario"
        value={q}
        onSearch={setQuery}
        className="md:max-w-md"
      />
      {list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Apicultores"
            columns={columns}
            rows={list.data?.rows}
            rowKey={(row) => row.id}
            card={(row) => <OrganizationCard row={row} />}
            loading={list.isFetching}
            empty={
              q ? (
                <EmptyState
                  icon={SearchX}
                  title="Sin resultados"
                  hint={`Nada coincide con “${q}”.`}
                />
              ) : (
                <EmptyState icon={Users} title="Aún no hay apicultores" />
              )
            }
          />
          <Pagination page={page} pageCount={pageCount(list.data?.total ?? 0)} onChange={setPage} />
        </>
      )}
    </div>
  )
}
