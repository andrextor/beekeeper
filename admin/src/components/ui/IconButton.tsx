import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { buttonBase, buttonVariants } from './Button'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon
  label: string
  variant?: 'ghost' | 'secondary'
}

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(buttonBase, buttonVariants[variant], 'size-11 md:size-9', className)}
      {...props}
    >
      <Icon size={18} aria-hidden />
    </button>
  )
}
