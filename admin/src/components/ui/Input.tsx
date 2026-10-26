import { type InputHTMLAttributes, useId } from 'react'
import { cx } from '../../lib/cx'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'min-h-11 rounded-control border bg-surface px-3 text-base text-text placeholder:text-muted',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      />
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
