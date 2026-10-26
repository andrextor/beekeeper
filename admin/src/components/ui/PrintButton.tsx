import { Printer } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { formatDateTime } from '../../lib/format'
import { Button } from './Button'

/** The browser's print dialog, whose "Guardar como PDF" downloads the report; no PDF library. */
export function PrintButton() {
  const print = () => {
    // Collapsed inspections print with every field; the ones opened here close again afterwards.
    const closed = [...document.querySelectorAll('main details:not([open])')]
    for (const details of closed) details.setAttribute('open', '')
    window.addEventListener(
      'afterprint',
      () => {
        for (const details of closed) details.removeAttribute('open')
      },
      { once: true },
    )
    window.print()
  }
  return (
    <Button variant="secondary" size="sm" onClick={print} className="print:hidden">
      <Printer size={16} aria-hidden />
      Imprimir
    </Button>
  )
}

function PrintedAt() {
  const [at, setAt] = useState(() => new Date().toISOString())
  useEffect(() => {
    const update = () => setAt(new Date().toISOString())
    window.addEventListener('beforeprint', update)
    return () => window.removeEventListener('beforeprint', update)
  }, [])
  return <p className="hidden text-sm print:block">Impreso el {formatDateTime(at)}</p>
}

/** A page title with the print button beside it, and the print date only on paper. */
export function ReportTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {children}
        <PrintButton />
      </div>
      <PrintedAt />
    </div>
  )
}
