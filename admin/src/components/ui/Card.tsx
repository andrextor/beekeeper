import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

export const cardClass = 'rounded-card border border-border bg-surface shadow-xs'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(cardClass, 'animate-enter p-4 md:p-6', className)} {...props} />
}
