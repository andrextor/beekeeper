import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from './Input'

export function SearchInput({
  label,
  placeholder,
  value,
  onSearch,
  className,
}: {
  label: string
  placeholder?: string
  value: string
  onSearch: (value: string) => void
  className?: string
}) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  const latestOnSearch = useRef(onSearch)

  // The URL changed from outside (sidebar link, back/forward): show its search.
  if (value !== synced) {
    setSynced(value)
    if (value !== text.trim()) setText(value)
  }

  useEffect(() => {
    latestOnSearch.current = onSearch
  })

  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed === value) return
    const timer = setTimeout(() => latestOnSearch.current(trimmed), 300)
    return () => clearTimeout(timer)
  }, [text, value])

  return (
    <Input
      type="search"
      label={label}
      placeholder={placeholder}
      value={text}
      onChange={(event) => setText(event.target.value)}
      leading={<Search size={16} aria-hidden />}
      className={className}
    />
  )
}
