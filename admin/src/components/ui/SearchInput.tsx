import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed === value) return
    const timer = setTimeout(() => onSearch(trimmed), 300)
    return () => clearTimeout(timer)
  }, [text, value, onSearch])

  return (
    <Input
      type="search"
      label={label}
      placeholder={placeholder}
      value={text}
      onChange={(event) => setText(event.target.value)}
      className={className}
    />
  )
}
