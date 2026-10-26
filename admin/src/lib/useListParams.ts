import { useSearchParams } from 'react-router'

// Keeps p_offset far below the RPC's int4 limit.
const maxPage = 100_000

/** Search text and page live in the URL, so a copied link reopens the same list. */
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Math.min(maxPage, Math.max(1, Number.parseInt(params.get('page') ?? '', 10) || 1))

  function setQuery(next: string) {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)
        if (next) updated.set('q', next)
        else updated.delete('q')
        updated.delete('page')
        return updated
      },
      { replace: true },
    )
  }

  function setPage(next: number) {
    setParams((current) => {
      const updated = new URLSearchParams(current)
      if (next > 1) updated.set('page', String(next))
      else updated.delete('page')
      return updated
    })
  }

  return { q, page, setQuery, setPage }
}
