/**
 * One polite live region for status messages (the snackbar uses it). It lives in the topmost open
 * modal dialog when there is one: everything outside a modal is inert, and an inert live region is
 * never read out. The region exists before the text changes and the text lands a beat later, which
 * screen readers announce far more reliably than a region inserted together with its content.
 */
const ATTR = 'data-m3e-announcer'
const DELAY_MS = 120
let timer: ReturnType<typeof setTimeout> | undefined

function isModal(d: Element): boolean {
  try {
    return d.matches(':modal')
  } catch {
    return true
  }
}

function host(): Element {
  const modals = Array.from(document.querySelectorAll('dialog[open]')).filter(isModal)
  return modals[modals.length - 1] ?? document.body
}

export function announce(message: string): void {
  if (typeof document === 'undefined' || !document.body) return
  const parent = host()
  let region = parent.querySelector<HTMLElement>(`:scope > [${ATTR}]`)
  if (!region) {
    region = document.createElement('div')
    region.setAttribute(ATTR, '')
    region.setAttribute('aria-live', 'polite')
    region.setAttribute('aria-atomic', 'true')
    region.className = 'm3e-visually-hidden'
    parent.append(region)
  }
  const r = region
  r.textContent = ''
  clearTimeout(timer)
  timer = setTimeout(() => {
    r.textContent = message
  }, DELAY_MS)
}
