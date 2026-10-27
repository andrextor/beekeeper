import type { Hive } from '../lib/admin-api'
import { cx } from '../lib/cx'
import { hiveStatusLabels, label, queenColorLabels } from '../lib/labels'
import { Badge, type BadgeTone } from './ui/Badge'

const statusTones: Readonly<Record<string, BadgeTone>> = {
  active: 'success',
  dead: 'danger',
  absconded: 'danger',
}

// The international queen-marking colours, fixed whatever the theme.
const queenDots: Readonly<Record<string, string>> = {
  white: 'bg-white',
  yellow: 'bg-yellow-400',
  red: 'bg-red-600',
  green: 'bg-green-600',
  blue: 'bg-blue-600',
}

export function HiveStatusBadge({ hive }: { hive: Hive }) {
  return (
    <Badge tone={statusTones[hive.status] ?? 'neutral'}>
      {label(hiveStatusLabels, hive.status)}
    </Badge>
  )
}

export function QueenMark({ hive }: { hive: Hive }) {
  const dot = hive.queen_color ? queenDots[hive.queen_color] : undefined
  if (!hive.queen_year && !hive.queen_color) return <span className="text-muted">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      {dot && (
        <span
          role="img"
          aria-label={`Marca ${label(queenColorLabels, hive.queen_color).toLowerCase()}`}
          className={cx('size-3 rounded-full border border-border', dot)}
        />
      )}
      {/* A colour this panel does not know (a newer server) shows as text. */}
      {hive.queen_color && !dot && <span>{label(queenColorLabels, hive.queen_color)}</span>}
      {hive.queen_year ?? ''}
    </span>
  )
}
