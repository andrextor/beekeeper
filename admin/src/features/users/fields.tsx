import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { SearchInput } from '../../components/ui/SearchInput'
import { type FarmOption, searchLiveOrganizations } from '../../lib/admin-api'
import { generatePassword } from '../../lib/create-user'

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
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="break-all font-mono text-lg">{value}</span>
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

export function FarmPicker({
  value,
  onChange,
  error,
}: {
  value: FarmOption | null
  onChange: (farm: FarmOption | null) => void
  error?: string
}) {
  const [search, setSearch] = useState('')
  const farms = useQuery({
    queryKey: ['admin-orgs', 'picker', search],
    queryFn: () => searchLiveOrganizations(search),
    enabled: value === null,
  })

  if (value) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Finca</span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="font-medium">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-11 text-sm text-primary hover:underline"
          >
            Cambiar
          </button>
        </span>
      </div>
    )
  }

  const rows = farms.data ?? []
  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        label="Finca"
        placeholder="Nombre de la finca"
        value={search}
        onSearch={setSearch}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {farms.isError ? (
        <p className="text-sm text-danger">No pudimos cargar las fincas. Inténtalo de nuevo.</p>
      ) : farms.isPending ? (
        <p className="text-sm text-muted">Cargando fincas…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No hay fincas con ese nombre.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((farm) => (
            <li key={farm.id}>
              <button
                type="button"
                onClick={() => onChange(farm)}
                className="flex min-h-11 w-full flex-col items-start rounded-control px-3 py-2 text-left transition hover:bg-glass-field"
              >
                <span className="font-medium">{farm.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
