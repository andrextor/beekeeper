import { Hexagon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../../components/ui/Card'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="stagger flex w-full max-w-[400px] flex-col gap-6 shadow-xl md:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-card bg-primary/10 text-primary">
            <Hexagon size={26} aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Landak Apiario</h1>
            <p className="text-sm text-muted">Panel de administración</p>
          </div>
        </div>
        {children}
      </Card>
    </main>
  )
}
