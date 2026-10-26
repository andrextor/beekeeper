import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'
import { HiveStatusBadge, QueenMark } from '../../components/HiveBadges'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Card } from '../../components/ui/Card'
import { FactList } from '../../components/ui/FactList'
import { NotFoundState } from '../../components/ui/NotFoundState'
import { ReportTitle } from '../../components/ui/PrintButton'
import { QueryError } from '../../components/ui/QueryError'
import { Segmented } from '../../components/ui/Segmented'
import { Skeleton } from '../../components/ui/Skeleton'
import { apiaryQuery, type Hive, hiveQuery, organizationSummaryQuery } from '../../lib/admin-api'
import { formatColonyAge, plural } from '../../lib/format'
import { colonyOriginLabels, hiveTypeLabels, label, queenOriginLabels } from '../../lib/labels'
import { PhotosTab } from './PhotosTab'
import { TimelineList } from './TimelineList'

type Tab = 'historial' | 'fotos'

const tabs: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'historial', label: 'Historial' },
  { value: 'fotos', label: 'Fotos' },
]

function boxes(hive: Hive): string | null {
  const parts = [
    hive.brood_boxes != null && plural(hive.brood_boxes, 'cámara', 'cámaras'),
    hive.supers != null && plural(hive.supers, 'alza', 'alzas'),
  ].filter((part): part is string => typeof part === 'string')
  return parts.length ? parts.join(' · ') : null
}

function queen(hive: Hive) {
  if (!hive.queen_year && !hive.queen_color && hive.queen_marked == null && !hive.queen_origin) {
    return null
  }
  const extra = [
    hive.queen_marked === true && 'marcada',
    hive.queen_marked === false && 'sin marcar',
    hive.queen_origin && label(queenOriginLabels, hive.queen_origin).toLowerCase(),
  ].filter((part): part is string => typeof part === 'string')
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {(hive.queen_year || hive.queen_color) && <QueenMark hive={hive} />}
      {extra.length > 0 && <span>{extra.join(' · ')}</span>}
    </span>
  )
}

function Header({ hive }: { hive: Hive }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <ReportTitle>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{hive.name}</h1>
            <HiveStatusBadge hive={hive} />
          </div>
        </ReportTitle>
        <p className="text-sm text-muted">
          QR <span className="font-mono text-text">{hive.qr_code}</span>
        </p>
      </div>
      <Card>
        <FactList
          facts={[
            { term: 'Tipo', value: hive.hive_type && label(hiveTypeLabels, hive.hive_type) },
            { term: 'Cámaras y alzas', value: boxes(hive) },
            { term: 'Reina', value: queen(hive) },
            {
              term: 'Origen',
              value: hive.colony_origin && label(colonyOriginLabels, hive.colony_origin),
            },
            {
              term: 'Edad',
              value: hive.colony_started_on && formatColonyAge(hive.colony_started_on),
            },
            { term: 'Raza', value: hive.bee_race },
            { term: 'Notas', value: hive.notes },
          ]}
        />
      </Card>
    </>
  )
}

export function HivePage() {
  const { id = '', hiveId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'fotos' ? 'fotos' : 'historial'
  const organization = useQuery(organizationSummaryQuery(id))
  const hive = useQuery(hiveQuery(hiveId))
  const found = hive.data && hive.data.organization_id === id ? hive.data : null
  const apiaryId = found?.apiary_id ?? ''
  const apiary = useQuery({ ...apiaryQuery(apiaryId), enabled: apiaryId !== '' })
  const organizationName = organization.data?.organization.name ?? 'Apicultor'

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Apicultores', to: '/apicultores' },
          { label: organizationName, to: `/apicultores/${id}` },
          ...(found
            ? [
                {
                  label: apiary.data?.name ?? 'Apiario',
                  to: `/apicultores/${id}/apiarios/${found.apiary_id}`,
                },
              ]
            : []),
          { label: found?.name ?? 'Colmena' },
        ]}
      />
      {organization.isError ? (
        // The summary RPC is the admin check here, as on the apiary page.
        <QueryError error={organization.error} onRetry={() => organization.refetch()} />
      ) : hive.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-40" />
        </div>
      ) : hive.isError ? (
        <QueryError error={hive.error} onRetry={() => hive.refetch()} />
      ) : !found ? (
        <NotFoundState
          title="Esta colmena no existe"
          backTo={`/apicultores/${id}`}
          backLabel={`Volver a ${organizationName}`}
        />
      ) : (
        <>
          <Header hive={found} />
          <Segmented
            label="Vista"
            options={tabs}
            value={tab}
            onChange={(next) => setParams(next === 'fotos' ? { tab: next } : {}, { replace: true })}
          />
          {tab === 'fotos' ? <PhotosTab hiveId={found.id} /> : <TimelineList hiveId={found.id} />}
        </>
      )}
    </div>
  )
}
