/**
 * Exit motion for elements that are about to leave (unmount, close(), hidePopover()).
 *
 * The element gets `data-closing`; the kit's CSS moves it to its closed state with transitions or
 * animations (and leaves `[data-closing]` out of every "open" selector). Once those finish — or
 * after a safety timeout, so a missing `transitionend` can never keep an element on screen — the
 * caller removes it. With reduced motion, or when nothing animates, it resolves right away.
 */

export const CLOSING = 'data-closing'
export const EXIT_TIMEOUT_MS = 2000

/** Finite animations running on `el` and its subtree (pseudo-elements included). */
function finiteAnimations(el: Element): Animation[] {
  if (typeof el.getAnimations !== 'function') return []
  return el.getAnimations({ subtree: true }).filter((a) => {
    const end = a.effect?.getComputedTiming().endTime
    // Spinners and other infinite loops inside a closing surface must not hold it open.
    return typeof end === 'number' && Number.isFinite(end)
  })
}

/**
 * Marks `el` as closing and resolves when its exit motion is over. Aborting (the element is
 * reopened mid-exit) clears the mark, so its transitions run back to the open state.
 */
export function animateExit(el: Element, signal?: AbortSignal, timeoutMs = EXIT_TIMEOUT_MS): Promise<void> {
  el.setAttribute(CLOSING, '')
  // getAnimations() flushes styles, so the transitions toward the closed state exist by now.
  const running = finiteAnimations(el)
  return new Promise<void>((resolve) => {
    if (signal?.aborted) {
      el.removeAttribute(CLOSING)
      resolve()
      return
    }
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }
    const onAbort = () => {
      el.removeAttribute(CLOSING)
      done()
    }
    const timer = setTimeout(done, timeoutMs)
    signal?.addEventListener('abort', onAbort, { once: true })
    // A transition replaced or cancelled mid-way rejects `finished`; allSettled still counts it.
    void Promise.allSettled(running.map((a) => a.finished)).then(done)
  })
}

/** Removes the closing mark, e.g. when a closing surface opens again. */
export function clearExit(el: Element | null | undefined): void {
  el?.removeAttribute(CLOSING)
}
