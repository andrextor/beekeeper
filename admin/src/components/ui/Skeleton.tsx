import { cx } from '../../lib/cx'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-control bg-border/60', className)} />
}
