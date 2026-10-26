import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { cx } from '../../lib/cx'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  /** A control inside the field's right edge, such as a show-password button. */
  trailing?: ReactNode
}

export function Input({ label, hint, error, trailing, id, className, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            'min-h-11 w-full rounded-control border bg-glass-field px-3 text-base text-text backdrop-blur-sm transition duration-200 placeholder:text-muted hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_4px] focus:shadow-primary/15 focus:outline-none',
            error ? 'border-danger' : 'border-field-border',
            trailing != null && 'pr-12',
          )}
          {...props}
        />
        {trailing != null && (
          <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
