import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export const cardClass = 'rounded-card border border-border bg-surface shadow-xs'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(cardClass, 'animate-enter p-4 md:p-6', className)} {...props} />
}

/** A settings block: title and description, its fields, and a footer bar for the actions. */
export function SectionCard({
  title,
  description,
  footer,
  children,
}: {
  title: string
  description?: ReactNode
  footer?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className={cx(cardClass, 'animate-enter overflow-hidden')}>
      <div className="flex flex-col gap-1 px-4 pt-5 md:px-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <div className="text-sm text-muted">{description}</div>}
      </div>
      {children ? (
        <div className="flex flex-col gap-4 px-4 py-5 md:px-6">{children}</div>
      ) : (
        <div className="pb-5" />
      )}
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted-surface/50 px-4 py-3 md:px-6">
          {footer}
        </div>
      )}
    </section>
  )
}
