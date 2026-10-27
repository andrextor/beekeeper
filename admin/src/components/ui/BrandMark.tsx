/** The app icon's three-cell honeycomb, drawn like a Lucide icon so it takes the same props. */
const brandMarkPath =
  'M8.54 5 12 7v4l-3.46 2-3.47-2V7zM15.46 5l3.47 2v4l-3.47 2L12 11V7zM12 11l3.46 2v4L12 19l-3.46-2v-4z'

export function BrandMark({
  size = 24,
  strokeWidth = 2,
  className,
}: {
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={brandMarkPath} />
    </svg>
  )
}
