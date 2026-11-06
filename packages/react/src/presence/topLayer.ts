import { animateExit, CLOSING, EXIT_TIMEOUT_MS } from './exit'

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
