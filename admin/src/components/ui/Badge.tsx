import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'danger' | 'success' | 'warning'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-muted-surface text-muted ring-border',
  primary: 'bg-primary/10 text-primary ring-primary/25',
  accent: 'bg-accent text-on-accent ring-accent',
  danger: 'bg-danger/10 text-danger ring-danger/25',
  success: 'bg-success-bg text-primary ring-primary/20',
  warning: 'bg-warning-bg text-text ring-accent/40',
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  dot = false,
  children,
}: {
  tone?: BadgeTone
  icon?: LucideIcon
  /** A leading dot in the tone's color, for states. */
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  )
}
