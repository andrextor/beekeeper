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
    <div
      role="group"
      aria-label={label}
      className="glass inline-flex gap-1 self-start rounded-control p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cx(
            'min-h-11 rounded-control px-4 text-sm font-medium transition duration-200 md:min-h-9',
            option.value === value
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-muted hover:bg-glass-field hover:text-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
