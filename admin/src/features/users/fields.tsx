import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Eye, EyeOff, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { cardClass } from '../../components/ui/Card'
import { IconButton } from '../../components/ui/IconButton'
import { Field, fieldClass, Input } from '../../components/ui/Input'
import { type FarmOption, searchLiveOrganizations } from '../../lib/admin-api'
import { generatePassword } from '../../lib/create-user'
import { cx } from '../../lib/cx'

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-1 rounded-control border border-border bg-muted-surface pl-3">
        <span className="min-w-0 flex-1 break-all py-2 font-mono text-sm">{value}</span>
        <IconButton
          icon={copied === 'yes' ? Check : Copy}
          label={copied === 'yes' ? 'Copiado' : `Copiar ${label.toLowerCase()}`}
          onClick={copy}
        />
      </span>
      {copied === 'failed' && (
        <span role="alert" className="text-sm text-danger">
          No se pudo copiar. Selecciona el texto y cópialo a mano.
        </span>
      )}
    </div>
  )
}

/** A farm combobox: type to search live farms, pick one from the dropdown. `exclude` hides farms already chosen. */
export function FarmPicker({
  value,
  onChange,
  error,
  exclude = [],
}: {
  value: FarmOption | null
  onChange: (farm: FarmOption | null) => void
  error?: string
  exclude?: ReadonlyArray<string>
}) {
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text])

  const farms = useQuery({
    queryKey: ['admin-orgs', 'picker', search],
    queryFn: () => searchLiveOrganizations(search),
    enabled: open && value === null,
  })
  const rows = (farms.data ?? []).filter((farm) => !exclude.includes(farm.id))

  const pick = (farm: FarmOption) => {
    onChange(farm)
    setOpen(false)
    setText('')
  }

  return (
    <Field label="Finca" error={error}>
      {({ id, describedBy }) =>
        value ? (
          <div className={cx(fieldClass(false), 'flex items-center justify-between gap-2 pr-1')}>
            <span className="truncate font-medium">{value.name}</span>
            <IconButton icon={X} label="Cambiar finca" onClick={() => onChange(null)} />
          </div>
        ) : (
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id={id}
              role="combobox"
              aria-expanded={open}
              aria-controls={`${id}-list`}
              aria-autocomplete="list"
              aria-activedescendant={open && rows[active] ? `${id}-${rows[active].id}` : undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              autoComplete="off"
              placeholder="Busca por nombre"
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setActive(0)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setOpen(true)
                  setActive((current) => Math.min(current + 1, rows.length - 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActive((current) => Math.max(current - 1, 0))
                } else if (event.key === 'Enter' && open && rows[active]) {
                  event.preventDefault()
                  pick(rows[active])
                } else if (event.key === 'Escape') {
                  setOpen(false)
                }
              }}
              className={cx(fieldClass(Boolean(error)), 'pl-9')}
            />
            {open && (
              <div
                className={cx(
                  cardClass,
                  'absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto p-1 shadow-lg',
                )}
              >
                {farms.isError ? (
                  <p className="px-2 py-2 text-sm text-danger">
                    No pudimos cargar las fincas. Inténtalo de nuevo.
                  </p>
                ) : farms.isPending ? (
                  <p className="px-2 py-2 text-sm text-muted">Buscando…</p>
                ) : rows.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-muted">No hay fincas con ese nombre.</p>
                ) : (
                  <ul id={`${id}-list`} role="listbox" aria-label="Fincas">
                    {rows.map((farm, index) => (
                      <li
                        key={farm.id}
                        id={`${id}-${farm.id}`}
                        role="option"
                        aria-selected={index === active}
                        // mousedown, not click: the input's blur would close the list first.
                        onMouseDown={(event) => {
                          event.preventDefault()
                          pick(farm)
                        }}
                        onMouseEnter={() => setActive(index)}
                        className={cx(
                          'flex min-h-11 cursor-pointer items-center rounded-control px-2 text-sm md:min-h-9',
                          index === active && 'bg-muted-surface',
                        )}
                      >
                        {farm.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      }
    </Field>
  )
}

/** A password field with show/hide and, for passwords someone else will receive, Generar. */
export function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete = 'new-password',
  generate = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete?: string
  generate?: boolean
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        hint="Mínimo 8 caracteres."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        trailing={
          <IconButton
            icon={shown ? EyeOff : Eye}
            label={shown ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShown((current) => !current)}
          />
        }
      />
      {generate && (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => {
            onChange(generatePassword())
            setShown(true)
          }}
        >
          <Sparkles size={16} aria-hidden />
          Generar
        </Button>
      )}
    </div>
  )
}
