import { Construction } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'

export function PagePlaceholder({ title, module }: { title: string; module: string }) {
  return (
    <>
      <h1 className="text-3xl font-bold">{title}</h1>
      <EmptyState icon={Construction} title="En construcción" hint={`Llega en ${module}.`} />
    </>
  )
}
