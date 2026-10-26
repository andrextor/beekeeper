import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'danger' | 'success' | 'warning'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-glass-border bg-glass-field text-muted',
  primary: 'border-primary/40 bg-glass-field text-primary',
  accent: 'border-accent bg-accent text-on-accent',
  danger: 'border-danger/40 bg-glass-field text-danger',
  success: 'border-glass-border bg-success-bg/70 text-text',
  warning: 'border-glass-border bg-warning-bg/70 text-text',
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
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium backdrop-blur-sm',
        tones[tone],
      )}
    >
      {Icon && <Icon size={14} aria-hidden />}
      {children}
    </span>
  )
}
