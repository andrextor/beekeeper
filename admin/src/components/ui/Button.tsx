import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-sm hover:opacity-90',
  secondary: 'glass text-text hover:bg-glass-field',
  ghost: 'text-text hover:bg-glass-field',
  danger: 'bg-danger text-on-danger hover:opacity-90',
}

const sizes = {
  // Touch targets stay at 44 px on phones; sm only gets denser from md up.
  sm: 'min-h-11 px-3 text-sm md:min-h-9',
  md: 'min-h-11 px-4 text-base',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
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
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-control font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
