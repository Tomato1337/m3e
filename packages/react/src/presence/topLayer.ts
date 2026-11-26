import { animateExit, CLOSING, EXIT_TIMEOUT_MS } from './exit.ts'

let displayTransition: boolean | undefined

/**
 * Whether `display` really transitions with allow-discrete. Firefox parses the keyword without
 * doing it, so CSS.supports() alone is not enough: probe a throwaway element.
 */
function canTransitionDisplay(): boolean {
  if (displayTransition !== undefined) return displayTransition
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) return false
  const probe = document.createElement('div')
  // Shorthand on purpose: an engine that rejects allow-discrete drops the whole declaration.
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;'
  document.body.appendChild(probe)
  void getComputedStyle(probe).display
  probe.style.display = 'none'
  displayTransition = getComputedStyle(probe).display === 'block'
  probe.remove()
  return displayTransition
}

/**
 * Native top-layer exits need `overlay` + discrete `display` transitions (Chromium). Without them
 * (WebKit, i.e. Tauri on Linux and macOS) the element would leave the top layer at once, so the
 * kit plays the exit while it is still open (`data-closing`) and closes afterwards.
 * Evaluated lazily: the probe needs document.body.
 */
export function supportsTopLayerExit(): boolean {
  return !!window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay()
}

const NESTED_POPOVER_SELECTOR = '.m3e-combobox-popover, .m3e-menu'
const ESCAPE_KEYUP_TIMEOUT_MS = 2000
const POST_KEYUP_GRACE_MS = 50

type PendingEscape = {
  dialog: HTMLDialogElement
  timer: ReturnType<typeof setTimeout> | undefined
  expiresAt: number
}

let pendingEscape: PendingEscape | null = null
let escapeListenersInstalled = false

function clearPendingEscape(): void {
  if (!pendingEscape) return
  if (pendingEscape.timer !== undefined) clearTimeout(pendingEscape.timer)
  pendingEscape = null
}

function installEscapeListeners(): void {
  if (escapeListenersInstalled || typeof window === 'undefined') return
  escapeListenersInstalled = true
  window.addEventListener(
    'keydown',
    (e) => {
      // A new non-repeat Escape starts a fresh press, clearing any earlier unconsumed state (e.g. WebKitGTK).
      if (e.key === 'Escape' && !e.repeat) clearPendingEscape()
    },
    true,
  )
  window.addEventListener(
    'keyup',
    (e) => {
      // Chromium CloseWatcher dispatches <dialog> cancel during Escape keyup, after the popover closed on keydown.
      if (e.key !== 'Escape' || !pendingEscape) return
      const current = pendingEscape
      current.expiresAt = Date.now() + POST_KEYUP_GRACE_MS
      if (current.timer !== undefined) clearTimeout(current.timer)
      current.timer = setTimeout(() => {
        if (pendingEscape === current) pendingEscape = null
      }, POST_KEYUP_GRACE_MS)
    },
    true,
  )
  window.addEventListener('pointerdown', clearPendingEscape, true)
}

export function isPopoverOpen(el: HTMLElement): boolean {
  try {
    if (el.matches(':popover-open')) return true
  } catch {
    // Engines without :popover-open selector support fall back to data-open.
  }
  return el.dataset.open === 'true'
}

export function showPopover(el: HTMLElement): void {
  if (typeof el.showPopover === 'function') {
    el.showPopover()
  } else {
    el.dataset.open = 'true'
  }
}

export function hidePopover(el: HTMLElement): void {
  if (typeof el.hidePopover === 'function') {
    el.hidePopover()
  } else {
    delete el.dataset.open
  }
}

/**
 * Records that a nested manual popover (`Combobox` or `Menu`) inside a `<dialog>` handled `Escape`,
 * so the parent dialog suppresses the browser's `CloseWatcher` `cancel` event from the same key press.
 */
export function markEscapeConsumed(popover: HTMLElement | null, anchor?: HTMLElement | null): void {
  const dialog = popover?.closest('dialog') ?? anchor?.closest('dialog') ?? null
  if (!dialog) return
  installEscapeListeners()
  clearPendingEscape()
  const entry: PendingEscape = {
    dialog,
    timer: undefined,
    expiresAt: Date.now() + ESCAPE_KEYUP_TIMEOUT_MS,
  }
  entry.timer = setTimeout(() => {
    if (pendingEscape === entry) pendingEscape = null
  }, ESCAPE_KEYUP_TIMEOUT_MS)
  pendingEscape = entry
}

/**
 * Returns `true` when `dialog` has an open nested `Combobox`/`Menu` popover or one just consumed
 * this `Escape` press, so `Dialog` keeps itself open on the inner dismissal.
 */
export function consumeNestedEscape(dialog: HTMLDialogElement): boolean {
  for (const el of dialog.querySelectorAll<HTMLElement>(NESTED_POPOVER_SELECTOR)) {
    if (!el.hasAttribute(CLOSING) && isPopoverOpen(el)) {
      if (pendingEscape?.dialog === dialog) clearPendingEscape()
      return true
    }
  }
  if (pendingEscape && pendingEscape.dialog === dialog && Date.now() <= pendingEscape.expiresAt) {
    clearPendingEscape()
    return true
  }
  return false
}

/**
 * Closes a dialog or popover with its exit motion and resolves once that motion is over (so a
 * React owner can unmount it). Resolves `false` when aborted, i.e. reopened mid-exit.
 */
export async function closeTopLayer(el: HTMLElement, close: () => void, signal?: AbortSignal): Promise<boolean> {
  if (supportsTopLayerExit()) {
    close()
    // The transitions toward the closed state started with close(); wait for them, not for a timer.
    const running = el.getAnimations({ subtree: true }).filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
    if (running.length > 0) {
      await Promise.race([
        Promise.allSettled(running.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, EXIT_TIMEOUT_MS)),
      ])
    }
    return !signal?.aborted
  }
  await animateExit(el, signal)
  if (signal?.aborted || !el.hasAttribute(CLOSING)) return false
  el.removeAttribute(CLOSING)
  close()
  return true
}
