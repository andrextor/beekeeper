/** Feeds the pointer position to the honeycomb glow in theme.css (--pointer-x / --pointer-y), once per frame. */
export function trackPointerGlow(): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const style = document.documentElement.style
  let frame = 0
  window.addEventListener(
    'pointermove',
    (event) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        style.setProperty('--pointer-x', `${event.clientX}px`)
        style.setProperty('--pointer-y', `${event.clientY}px`)
      })
    },
    { passive: true },
  )
}
