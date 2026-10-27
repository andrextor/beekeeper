import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-xs hover:bg-primary/90',
  secondary: 'border border-border bg-surface text-text shadow-xs hover:bg-muted-surface',
  ghost: 'text-text hover:bg-muted-surface',
  danger: 'bg-danger text-on-danger shadow-xs hover:bg-danger/90',
  link: 'text-primary underline-offset-4 hover:underline',
}

const sizes = {
  // Touch targets stay at 44 px on phones; controls get denser from md up.
  sm: 'min-h-11 px-3 md:h-8 md:min-h-8',
  md: 'min-h-11 px-4 md:h-9 md:min-h-9',
  lg: 'min-h-11 px-5 md:h-10 md:min-h-10',
}

export const buttonBase =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: keyof typeof sizes
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonBase, buttonVariants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
