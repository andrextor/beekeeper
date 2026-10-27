import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge'
import { buttonBase, buttonSizes, buttonVariants } from '../../components/ui/Button'
import { type Column, DataTable, MobileCard } from '../../components/ui/DataTable'
import { ListEmpty } from '../../components/ui/ListEmpty'
import { Pagination } from '../../components/ui/Pagination'
import { QueryError } from '../../components/ui/QueryError'
import { SearchInput } from '../../components/ui/SearchInput'
import { fetchUsers, type UserRow } from '../../lib/admin-api'
import { cx } from '../../lib/cx'
import { formatDate } from '../../lib/format'
import { roleLabels, roleTones } from '../../lib/labels'
import { useListParams } from '../../lib/useListParams'

function MembershipBadge({ membership }: { membership: UserRow['organizations'][number] }) {
  return (
    <Badge tone={membership.deleted_at ? 'danger' : roleTones[membership.role]}>
      {roleLabels[membership.role]} · {membership.name}
      {membership.deleted_at && ' · Eliminado'}
    </Badge>
  )
}

/** `linked`: each badge opens its farm; off inside a card that is itself a link. */
function Memberships({ row, linked = true }: { row: UserRow; linked?: boolean }) {
  if (row.organizations.length === 0) return <span className="text-muted">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {row.organizations.map((membership) =>
        linked ? (
          <Link key={membership.id} to={`/apicultores/${membership.id}`} viewTransition>
            <MembershipBadge membership={membership} />
          </Link>
        ) : (
          <MembershipBadge key={membership.id} membership={membership} />
        ),
      )}
    </span>
  )
}

function Email({ row, linked = true }: { row: UserRow; linked?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {linked ? (
        <Link to={`/usuarios/${row.id}`} viewTransition className="font-medium hover:underline">
          {row.email}
        </Link>
      ) : (
        <span className="break-all font-medium">{row.email}</span>
      )}
      {row.deactivated_at && <Badge tone="danger">Desactivado</Badge>}
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
    <MobileCard to={`/usuarios/${row.id}`}>
      <Email row={row} linked={false} />
      {row.display_name && <span className="text-sm text-muted">{row.display_name}</span>}
      <span className="pt-1">
        <Memberships row={row} linked={false} />
      </span>
      <span className="text-xs text-muted">Alta {formatDate(row.created_at)}</span>
    </MobileCard>
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
      <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SearchInput
          label="Buscar"
          placeholder="Correo o nombre"
          value={q}
          onSearch={setQuery}
          className="md:w-full md:max-w-md"
        />
        <Link
          to="/usuarios/nuevo"
          viewTransition
          className={cx(
            buttonBase,
            buttonVariants.primary,
            buttonSizes.md,
            'self-start md:self-auto',
          )}
        >
          <UserPlus size={16} aria-hidden />
          Nuevo usuario
        </Link>
      </div>
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
            rowHref={(row) => `/usuarios/${row.id}`}
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
          <Pagination page={page} total={list.data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  )
}
