import { useInfiniteQuery } from '@tanstack/react-query'
import {
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  Crown,
  Droplet,
  History,
  Keyboard,
  type LucideIcon,
  Mic,
  Package,
  StickyNote,
  Syringe,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { FactList } from '../../components/ui/FactList'
import { QueryError } from '../../components/ui/QueryError'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  fetchTimeline,
  type HiveEvent,
  type Inspection,
  type TimelineCursor,
  type TimelineItem,
} from '../../lib/admin-api'
import { eventSummary } from '../../lib/event-summary'
import { formatDateTime } from '../../lib/format'
import { inspectionFields, inspectionSummary } from '../../lib/inspection-summary'
import { attentionLevelLabels, inspectionSourceLabels, label } from '../../lib/labels'

const eventIcons: Readonly<Record<string, LucideIcon>> = {
  note: StickyNote,
  feeding: Droplet,
  treatment: Syringe,
  harvest: Package,
  queen_change: Crown,
}

const attentionTones: Readonly<Record<string, BadgeTone>> = { soon: 'warning', urgent: 'danger' }

function Byline({ item }: { item: TimelineItem }) {
  return (
    <p className="text-sm text-muted">
      {formatDateTime(item.at)} · {item.author_name ?? 'Sin nombre'}
    </p>
  )
}

function ItemIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-glass-field text-primary">
      <Icon size={20} aria-hidden />
    </span>
  )
}

function InspectionHeading({ inspection }: { inspection: Inspection }) {
  const tone = inspection.attention_level ? attentionTones[inspection.attention_level] : undefined
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-medium">Revisión</span>
      <Badge icon={inspection.source === 'voice' ? Mic : Keyboard}>
        {label(inspectionSourceLabels, inspection.source)}
      </Badge>
      {tone && <Badge tone={tone}>{label(attentionLevelLabels, inspection.attention_level)}</Badge>}
    </span>
  )
}

function InspectionItem({ item, inspection }: { item: TimelineItem; inspection: Inspection }) {
  const fields = inspectionFields(inspection)
  const hasDetail = fields.length > 0 || inspection.transcript || inspection.notes
  const head = (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <InspectionHeading inspection={inspection} />
      <span>{inspectionSummary(inspection)}</span>
      <Byline item={item} />
    </span>
  )

  if (!hasDetail) {
    return (
      <Row>
        <ItemIcon icon={ClipboardCheck} />
        {head}
      </Row>
    )
  }
  return (
    <Card className="p-0 md:p-0">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none gap-3 p-4 md:px-6 [&::-webkit-details-marker]:hidden">
          <ItemIcon icon={ClipboardCheck} />
          {head}
          <ChevronDown
            size={20}
            aria-hidden
            className="mt-2 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-4 border-t border-glass-border p-4 md:px-6">
          <FactList facts={fields.map((field) => ({ term: field.label, value: field.value }))} />
          {inspection.transcript && (
            <figure className="flex flex-col gap-1">
              <figcaption className="text-sm text-muted">Lo que se dictó</figcaption>
              <blockquote className="whitespace-pre-line border-l-4 border-primary pl-3 italic">
                {inspection.transcript}
              </blockquote>
            </figure>
          )}
          <FactList facts={[{ term: 'Notas', value: inspection.notes }]} />
        </div>
      </details>
    </Card>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <Card className="flex gap-3 md:px-6 md:py-4">{children}</Card>
}

function EventItem({ item, event }: { item: TimelineItem; event: HiveEvent }) {
  const dictated =
    event.type === 'note' &&
    typeof event.details === 'object' &&
    !Array.isArray(event.details) &&
    event.details.source === 'voice'
  return (
    <Row>
      <ItemIcon icon={eventIcons[event.type] ?? CalendarClock} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="whitespace-pre-line">{eventSummary(event.type, event.details)}</span>
          {dictated && <Badge icon={Mic}>{inspectionSourceLabels.voice}</Badge>}
        </span>
        <Byline item={item} />
      </span>
    </Row>
  )
}

export function TimelineList({ hiveId }: { hiveId: string }) {
  const timeline = useInfiniteQuery({
    queryKey: ['admin-timeline', hiveId],
    queryFn: ({ pageParam }) => fetchTimeline(hiveId, pageParam),
    initialPageParam: null as TimelineCursor | null,
    getNextPageParam: (page) => page.next,
  })

  if (timeline.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    )
  }
  if (timeline.isError && !timeline.isFetchNextPageError) {
    return <QueryError error={timeline.error} onRetry={() => timeline.refetch()} />
  }

  const items = timeline.data?.pages.flatMap((page) => page.items) ?? []
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon={History} title="Aún no hay registros" />
      </Card>
    )
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="sr-only">Historial</h2>
      <ol className="stagger flex flex-col gap-3">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            {item.kind === 'inspection' ? (
              <InspectionItem item={item} inspection={item.inspection} />
            ) : (
              <EventItem item={item} event={item.event} />
            )}
          </li>
        ))}
      </ol>
      {timeline.isFetchNextPageError && (
        <QueryError error={timeline.error} onRetry={() => timeline.fetchNextPage()} />
      )}
      {timeline.hasNextPage && !timeline.isFetchNextPageError && (
        <Button
          variant="secondary"
          className="self-center"
          loading={timeline.isFetchingNextPage}
          onClick={() => timeline.fetchNextPage()}
        >
          Cargar más
        </Button>
      )}
    </section>
  )
}
