import { HardDrive } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { cx } from '../../lib/cx'
import { formatMegabytes, type StorageTone, storageUsage } from './storage'

const barTones: Record<StorageTone, string> = {
  ok: 'bg-primary',
  warning: 'bg-accent',
  danger: 'bg-danger',
}

export function StorageCard({ bytes }: { bytes: number }) {
  const { percent, tone } = storageUsage(bytes)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted">
        <HardDrive size={20} aria-hidden />
        <h2 className="text-base font-medium">Espacio de fotos</h2>
      </div>
      <p className="font-display text-2xl font-bold tabular-nums">
        {formatMegabytes(bytes)}{' '}
        <span className="text-base font-normal text-muted">de 1 GB gratis</span>
      </p>
      <div
        role="progressbar"
        aria-label="Espacio de fotos usado"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="h-3 overflow-hidden rounded-full bg-text/10"
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-500', barTones[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
      {tone !== 'ok' && (
        <p className={cx('text-sm', tone === 'danger' ? 'text-danger' : 'text-muted')}>
          Queda poco espacio gratis para fotos.
        </p>
      )}
    </Card>
  )
}
