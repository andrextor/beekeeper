import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { Field, fieldClass } from './Input'

/** A native select: keyboard, screen readers and the phone's own picker come with it. */
export function Select<T extends string>({
  label,
  hint,
  error,
  hideLabel,
  options,
  value,
  onChange,
  className,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'value' | 'onChange'> & {
  label: string
  hint?: string
  error?: string
  hideLabel?: boolean
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      {({ id, describedBy }) => (
        <div className="relative">
          <select
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            value={value}
            onChange={(event) => {
              const next = options.find((option) => option.value === event.target.value)
              if (next) onChange(next.value)
            }}
            className={cx(fieldClass(Boolean(error)), 'appearance-none pr-9')}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
            aria-hidden
          />
        </div>
      )}
    </Field>
  )
}
