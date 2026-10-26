import type { ReactNode } from 'react'

export type Fact = { term: string; value: ReactNode }

/** A term/value grid; facts without a value are left out. */
export function FactList({ facts }: { facts: ReadonlyArray<Fact> }) {
  const shown = facts.filter((fact) => fact.value != null && fact.value !== '')
  if (shown.length === 0) return null
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {shown.map((fact) => (
        <div key={fact.term} className="flex flex-col gap-0.5">
          <dt className="text-sm text-muted">{fact.term}</dt>
          <dd className="whitespace-pre-line">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
