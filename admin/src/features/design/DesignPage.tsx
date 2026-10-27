import { Clock, Hexagon, Inbox, Plus, Search, Siren, TriangleAlert } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { ThemeToggle } from '../../components/layout/ThemeToggle'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, SectionCard } from '../../components/ui/Card'
import { type Column, DataTable, MobileCard } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { Segmented } from '../../components/ui/Segmented'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Card className="flex flex-wrap items-start gap-3">{children}</Card>
    </section>
  )
}

const sampleRows = [
  { id: '1', name: 'Vallecito 1', hives: 12, status: 'Activa' },
  { id: '2', name: 'La Loma', hives: 4, status: 'Activa' },
  { id: '3', name: 'El Guamo', hives: 0, status: 'Inactiva' },
]
type SampleRow = (typeof sampleRows)[number]

const sampleColumns: ReadonlyArray<Column<SampleRow>> = [
  { header: 'Apiario', cell: (row) => <span className="font-medium">{row.name}</span> },
  {
    header: 'Estado',
    cell: (row) => (
      <Badge tone={row.status === 'Activa' ? 'success' : 'neutral'} dot>
        {row.status}
      </Badge>
    ),
  },
  { header: 'Colmenas', cell: (row) => row.hives, className: 'text-right' },
]

function TableDemo() {
  const [page, setPage] = useState(1)
  return (
    <div className="flex flex-col gap-3">
      <DataTable
        caption="Ejemplo"
        columns={sampleColumns}
        rows={sampleRows}
        rowKey={(row) => row.id}
        rowHref={() => '/_design'}
        card={(row) => (
          <MobileCard to="/_design">
            <span className="font-medium">{row.name}</span>
            <span className="text-sm text-muted">{row.hives} colmenas</span>
          </MobileCard>
        )}
        empty={null}
      />
      <Pagination page={page} total={132} onChange={setPage} />
    </div>
  )
}

function SelectDemo() {
  const [role, setRole] = useState<'reviewer' | 'owner'>('reviewer')
  return (
    <Select
      label="Rol"
      options={[
        { value: 'reviewer', label: 'Revisor' },
        { value: 'owner', label: 'Propietario' },
      ]}
      value={role}
      onChange={setRole}
      className="w-72"
    />
  )
}

function SegmentedDemo() {
  const [view, setView] = useState<'apiaries' | 'people'>('apiaries')
  return (
    <Segmented
      label="Vista"
      options={[
        { value: 'apiaries', label: 'Apiarios' },
        { value: 'people', label: 'Personas' },
      ]}
      value={view}
      onChange={setView}
    />
  )
}

/** Dev-only gallery (/_design): every component and its states, to review in light and dark at 390 and 1440 px. */
export function DesignPage() {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-6 lg:px-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Sistema de diseño</h1>
        <ThemeToggle />
      </header>

      <Section title="Colores">
        {[
          ['bg-bg', 'bg'],
          ['bg-surface', 'surface'],
          ['bg-primary', 'primary'],
          ['bg-accent', 'accent'],
          ['bg-danger', 'danger'],
          ['bg-success-bg', 'success-bg'],
          ['bg-warning-bg', 'warning-bg'],
          ['glass', 'glass'],
          ['bg-muted-surface', 'muted-surface'],
          ['bg-input', 'input'],
        ].map(([className, name]) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <div className={`size-16 rounded-control border border-border ${className}`} />
            <span className="text-xs text-muted">{name}</span>
          </div>
        ))}
      </Section>

      <Section title="Tipografía">
        <div className="flex flex-col gap-2">
          <p className="font-display text-4xl font-bold">1.234 colmenas</p>
          <h1 className="text-2xl font-bold tracking-tight">Título h1 · Plus Jakarta Sans</h1>
          <h3 className="text-xl font-semibold">Subtítulo h3 · Plus Jakarta Sans</h3>
          <p>Texto de cuerpo en Inter. Revisión del 24 oct 2026.</p>
          <p className="text-sm text-muted">Texto secundario y de tablas.</p>
        </div>
      </Section>

      <Section title="Botones">
        <Button>Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="ghost">Fantasma</Button>
        <Button variant="danger">Peligro</Button>
        <Button loading>Guardando</Button>
        <Button disabled>Deshabilitado</Button>
        <Button variant="link">Enlace</Button>
        <Button size="sm">Pequeño</Button>
        <Button size="lg">Grande</Button>
        <Button variant="secondary">
          <Plus size={16} aria-hidden />
          Con icono
        </Button>
        <IconButton icon={Search} label="Buscar" />
        <IconButton icon={Search} label="Buscar" variant="secondary" />
      </Section>

      <Section title="Campos">
        <Input
          label="Correo"
          type="email"
          placeholder="nombre@correo.com"
          hint="El que usas para entrar."
          className="w-72"
        />
        <Input
          label="Contraseña"
          type="password"
          error="La contraseña no coincide."
          className="w-72"
        />
        <Input label="Deshabilitado" disabled value="Solo lectura" readOnly className="w-72" />
        <SearchInput
          label="Buscar"
          placeholder="Nombre"
          value=""
          onSearch={() => undefined}
          className="w-72"
        />
        <SelectDemo />
      </Section>

      <Section title="Pestañas">
        <SegmentedDemo />
      </Section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Tabla</h2>
        <TableDemo />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Sección con acciones</h2>
        <SectionCard
          title="Datos"
          description="Un formulario, un solo guardar."
          footer={
            <>
              <Button variant="ghost">Descartar</Button>
              <Button>Guardar cambios</Button>
            </>
          }
        >
          <Input label="Nombre" defaultValue="Ana Pérez" className="md:w-96" />
        </SectionCard>
      </section>

      <Section title="Insignias">
        <Badge tone="primary" icon={Hexagon}>
          Activa
        </Badge>
        <Badge icon={Hexagon}>Inactiva</Badge>
        <Badge tone="danger" icon={Hexagon}>
          Muerta
        </Badge>
        <Badge tone="accent" icon={Clock}>
          Pronto
        </Badge>
        <Badge tone="danger" icon={Siren}>
          Urgente
        </Badge>
        <Badge tone="success" dot>
          Sincronizado
        </Badge>
        <Badge tone="neutral" dot>
          Revisor
        </Badge>
        <Badge tone="warning" icon={TriangleAlert}>
          Pendiente
        </Badge>
      </Section>

      <Section title="Cargando">
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Section>

      <Section title="Estados">
        <div className="grid w-full gap-4 md:grid-cols-2">
          <EmptyState
            icon={Inbox}
            title="Sin apicultores todavía"
            hint="Aparecen aquí cuando alguien crea su organización."
          />
          <ErrorState onRetry={() => undefined} />
        </div>
      </Section>
    </main>
  )
}
