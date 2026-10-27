import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { cx } from '../../lib/cx'

/** The look every text field and select shares; `invalid` swaps the border and ring to danger. */
export function fieldClass(invalid: boolean): string {
  return cx(
    'min-h-11 w-full rounded-control border bg-surface px-3 text-base text-text shadow-xs transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted focus:outline-none focus-visible:outline-none focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:min-h-9 md:text-sm',
    invalid
      ? 'border-danger focus:ring-danger/25'
      : 'border-input hover:border-muted focus:border-primary focus:ring-ring',
  )
}

/** Label, hint and error around a control; the control gets `id` and `aria-describedby`. */
export function Field({
  label,
  hint,
  error,
  hideLabel = false,
  className,
  children,
}: {
  label: string
  hint?: string
  error?: string
  /** Keep the label for screen readers only, where the row already says what the control is. */
  hideLabel?: boolean
  className?: string
  children: (control: { id: string; describedBy: string | undefined }) => ReactNode
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-sm font-medium'}>
        {label}
      </label>
      {children({ id, describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  hint?: string
  error?: string
  /** An icon inside the field's left edge, such as a search glass. */
  leading?: ReactNode
  /** A control inside the field's right edge, such as a show-password button. */
  trailing?: ReactNode
}

export function Input({ label, hint, error, leading, trailing, className, ...props }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <div className="relative">
          {leading != null && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              {leading}
            </div>
          )}
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cx(
              fieldClass(Boolean(error)),
              leading != null && 'pl-9',
              trailing != null && 'pr-12',
            )}
            {...props}
          />
          {trailing != null && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-0.5">{trailing}</div>
          )}
        </div>
      )}
    </Field>
  )
}
