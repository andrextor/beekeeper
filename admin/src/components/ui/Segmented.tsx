import { cx } from '../../lib/cx'

/** A small group of toggle buttons where exactly one is pressed: views and filters. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="inline-flex gap-1 self-start rounded-card bg-muted-surface p-1 print:hidden">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cx(
            'min-h-11 rounded-control px-3 text-sm font-medium transition-colors duration-150 md:min-h-8',
            option.value === value
              ? 'bg-surface text-text shadow-xs ring-1 ring-border'
              : 'text-muted hover:text-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
