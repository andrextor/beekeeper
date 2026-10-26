import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon
  label: string
}

export function IconButton({
  icon: Icon,
  label,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-11 items-center justify-center rounded-control text-text transition hover:bg-border/40 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Icon size={20} aria-hidden />
    </button>
  )
}
