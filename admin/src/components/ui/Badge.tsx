import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'danger' | 'success' | 'warning'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-border text-muted',
  primary: 'border-primary text-primary',
  accent: 'border-accent bg-accent text-on-accent',
  danger: 'border-danger text-danger',
  success: 'border-transparent bg-success-bg text-text',
  warning: 'border-transparent bg-warning-bg text-text',
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
}: {
  tone?: BadgeTone
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {Icon && <Icon size={14} aria-hidden />}
      {children}
    </span>
  )
}
