import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { type Column, DataTable } from '../../components/ui/DataTable'
import { ListEmpty } from '../../components/ui/ListEmpty'
import { Pagination } from '../../components/ui/Pagination'
import { QueryError } from '../../components/ui/QueryError'
import { SearchInput } from '../../components/ui/SearchInput'
import { fetchUsers, pageCount, type UserRow } from '../../lib/admin-api'
import { formatDate } from '../../lib/format'
import { roleLabels } from '../../lib/labels'
import { useListParams } from '../../lib/useListParams'

function Memberships({ row }: { row: UserRow }) {
  if (row.organizations.length === 0) return <span className="text-muted">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {row.organizations.map((membership) => (
        <Link key={membership.id} to={`/apicultores/${membership.id}`} viewTransition>
          <Badge
            tone={
              membership.deleted_at ? 'danger' : membership.role === 'owner' ? 'primary' : 'neutral'
            }
          >
            {roleLabels[membership.role]} · {membership.name}
            {membership.deleted_at && ' · Eliminado'}
          </Badge>
        </Link>
      ))}
    </span>
  )
}

function Email({ row }: { row: UserRow }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-medium">{row.email}</span>
      {row.is_platform_admin && (
        <Badge tone="accent" icon={ShieldCheck}>
          Admin
        </Badge>
      )}
    </span>
  )
}

const columns: ReadonlyArray<Column<UserRow>> = [
  { header: 'Correo', cell: (row) => <Email row={row} /> },
  { header: 'Nombre', cell: (row) => row.display_name ?? '—' },
  { header: 'Organizaciones', cell: (row) => <Memberships row={row} /> },
  { header: 'Alta', cell: (row) => formatDate(row.created_at) },
]

function UserCard({ row }: { row: UserRow }) {
  return (
    <div className="glass flex flex-col gap-2 rounded-card p-4">
      <Email row={row} />
      {row.display_name && <span className="text-sm text-muted">{row.display_name}</span>}
      <Memberships row={row} />
      <span className="text-sm text-muted">Alta {formatDate(row.created_at)}</span>
    </div>
  )
}

export function UsersPage() {
  const { q, page, setQuery, setPage } = useListParams()
  const list = useQuery({
    queryKey: ['admin-users', q, page],
    queryFn: () => fetchUsers(q, page),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Usuarios</h1>
      <SearchInput
        label="Buscar"
        placeholder="Correo o nombre"
        value={q}
        onSearch={setQuery}
        className="md:max-w-md"
      />
      {list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Usuarios"
            columns={columns}
            rows={list.data?.rows}
            rowKey={(row) => row.id}
            card={(row) => <UserCard row={row} />}
            loading={list.isPlaceholderData}
            empty={
              <ListEmpty
                q={q}
                page={page}
                onFirstPage={() => setPage(1)}
                icon={UserRound}
                title="Aún no hay usuarios"
              />
            }
          />
          <Pagination page={page} pageCount={pageCount(list.data?.total ?? 0)} onChange={setPage} />
        </>
      )}
    </div>
  )
}
