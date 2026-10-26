import { Clock, Hexagon, Inbox, Search, Siren, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { ThemeToggle } from '../../components/layout/ThemeToggle'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Card className="flex flex-wrap items-start gap-3">{children}</Card>
    </section>
  )
}

/** Dev-only gallery (/_design): every component and its states, to review in light and dark at 390 and 1440 px. */
export function DesignPage() {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-6 lg:px-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sistema de diseño</h1>
        <ThemeToggle className="hover:bg-border/40" />
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
          <h1 className="text-3xl font-bold">Título h1 · Arsenal</h1>
          <h3 className="text-xl">Subtítulo h3 · Arsenal</h3>
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
        <Button size="sm">Pequeño</Button>
        <IconButton icon={Search} label="Buscar" />
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
      </Section>

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
        <Badge tone="success">Sincronizado</Badge>
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
