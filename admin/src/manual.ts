import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/inter'

for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-copy]')) {
  button.addEventListener('click', async () => {
    const source = document.getElementById(button.dataset.copy ?? '')
    if (!source) return
    const original = button.textContent
    try {
      await navigator.clipboard.writeText(source.textContent?.trim() ?? '')
      button.textContent = 'Copiado'
    } catch {
      const range = document.createRange()
      range.selectNodeContents(source)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      button.textContent = 'Selecciónalo y cópialo'
    }
    setTimeout(() => {
      button.textContent = original
    }, 2000)
  })
}
