import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('glass rounded-card p-4 md:p-6', className)} {...props} />
}
