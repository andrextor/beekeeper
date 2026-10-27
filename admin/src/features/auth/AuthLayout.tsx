import { CloudOff, Hexagon, QrCode, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { ThemeToggle } from '../../components/layout/ThemeToggle'

const facts = [
  { icon: QrCode, text: 'Cada colmena con su QR y su historial' },
  { icon: CloudOff, text: 'La app trabaja sin señal y sincroniza sola' },
  { icon: ShieldCheck, text: 'Cada finca ve solo sus datos' },
]

function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-card bg-accent text-on-accent shadow-sm">
        <Hexagon size={22} strokeWidth={2.4} aria-hidden />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">Landak Apiario</span>
    </span>
  )
}

/**
 * The front door. From lg the "Panal" band (as in the app) takes the left half with the
 * product in one sentence; the form keeps the right. On a phone the band is a hero on top
 * and the form rises over it as a sheet.
 */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      <aside className="panal-band flex flex-col justify-between gap-10 px-6 pt-10 pb-16 lg:px-12 lg:py-12">
        <Logo />
        <div className="flex max-w-md flex-col gap-6">
          <p className="text-xs font-semibold tracking-[0.12em] text-mist uppercase">
            Panel de administración
          </p>
          <p className="font-display text-2xl leading-tight font-bold tracking-tight text-balance lg:text-4xl">
            Cada colmena, su historia. <span className="text-accent">Aunque no haya señal.</span>
          </p>
          <ul className="hidden flex-col gap-3 lg:flex">
            {facts.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex size-8 items-center justify-center rounded-control bg-white/10 text-accent">
                  <Icon size={16} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-xs text-white/50 lg:block">
          Impulsado por Finca Landak · Agroecología Integral
        </p>
      </aside>

      <main className="relative -mt-8 flex flex-col rounded-t-[28px] bg-bg px-6 pt-8 pb-10 lg:mt-0 lg:rounded-none lg:px-12">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
