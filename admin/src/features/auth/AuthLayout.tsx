import { Hexagon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../../components/ui/Card'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="flex w-full max-w-[400px] flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Hexagon size={40} className="text-primary" aria-hidden />
          <h1 className="text-2xl font-bold text-balance">Landak Apiario · Administración</h1>
        </div>
        {children}
      </Card>
    </main>
  )
}
