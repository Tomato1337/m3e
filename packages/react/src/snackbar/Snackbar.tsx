import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { announce } from '../a11y/announce.ts'
import { Button } from '../button/Button.tsx'
import { cx } from '../cx.ts'
import { Icon } from '../icon/Icon.tsx'
import { clearExit } from '../presence/exit.ts'
import { closeTopLayer } from '../presence/topLayer.ts'
import { WavyProgress } from '../progress/WavyProgress.tsx'
import { useLatest } from '../useLatest.ts'
import { hideToast, toastStore, useToast, type ToastAction, type ToastOptions } from './toast.ts'

type Shown = { message: string; options: ToastOptions; seq: number }

export type SnackbarProps = {
  /** Edge for messages that do not set their own `placement`. Default `bottom`. */
  placement?: 'bottom' | 'top'
  /** Distance from the top edge in px for top placement, e.g. to clear an app bar. */
  topOffset?: number
  /** Distance from the bottom edge in px, e.g. to clear other floating UI. */
  bottomOffset?: number
  className?: string
}

const DEFAULT_DURATION_MS = 4000

/**
 * Where the actions go: beside the message, on their own row below it (< 480 px), or one per row
 * (< 320 px). Kept in script so it reaches the DOM as `data-layout`.
 */
type Layout = 'inline' | 'below' | 'stacked'
const BELOW = '(width < 480px)'
const STACKED = '(width < 320px)'

function subscribeLayout(onChange: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => {}
  const queries = [matchMedia(BELOW), matchMedia(STACKED)]
  queries.forEach((q) => q.addEventListener('change', onChange))
  return () => queries.forEach((q) => q.removeEventListener('change', onChange))
}

function currentLayout(): Layout {
  if (typeof matchMedia !== 'function') return 'inline'
  if (matchMedia(STACKED).matches) return 'stacked'
  return matchMedia(BELOW).matches ? 'below' : 'inline'
}

/** Auto-dismissal that can be paused and resumed with its remaining time kept. */
type Countdown = { run(): void; pause(): void }

function countdown(ms: number, done: () => void): Countdown {
  let remaining = ms
  let since = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    run() {
      if (timer !== undefined) return
      since = performance.now()
      timer = setTimeout(done, remaining)
    },
    pause() {
      if (timer === undefined) return
      clearTimeout(timer)
      timer = undefined
      remaining = Math.max(0, remaining - (performance.now() - since))
    },
  }
}

/** Runs an action; a failure goes to the global error handler instead of tearing down the host. */
async function settle(action: ToastAction): Promise<void> {
  try {
    await action.run()
  } catch (error) {
    if (typeof reportError === 'function') reportError(error)
    else console.error(error)
  }
}

/**
 * The app's single M3 snackbar, fed by `toast()`. A manual popover, so it renders in the top layer
 * above everything — including a modal dialog opened before it (it is re-shown per message to stay
 * the topmost layer). Content outside an open modal dialog is inert, so its actions are only
 * clickable once the dialog closes. Enter and exit animate (see snackbar.css); the timer runs in
 * script and pauses while the pointer is over the snackbar or focus is inside it.
 *
 * A message is identified by its `seq`: a new one enters, raises and is announced; `updateToast()`
 * only refreshes the content of the current one. Screen readers hear a new message through
 * `announce()`, whose live region follows an open modal dialog — a live region on this popover
 * would be inert, and silent, behind one.
 */
export function Snackbar({ placement = 'bottom', topOffset, bottomOffset, className }: SnackbarProps) {
  const { message, options, seq } = useToast()
  const layout = useSyncExternalStore(subscribeLayout, currentLayout, () => 'inline' as const)
  const [shown, setShown] = useState<Shown | null>(null)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  /** The message whose `dismiss: false` action is still running; its buttons stay locked. */
  const [pending, setPending] = useState<number | null>(null)
  const el = useRef<HTMLDivElement>(null)

  const visible = message !== null
  if (visible && (shown?.seq !== seq || shown.message !== message || shown.options !== options)) {
    setShown({ message, options, seq })
  }
  // A hidden popover gets no pointerleave/blur; the next message must not start paused.
  if (!visible && (hover || focus)) {
    setHover(false)
    setFocus(false)
  }
  const interacting = visible && (hover || focus)
  const busy = pending !== null && pending === shown?.seq
  const paused = interacting || busy
  const durationMs = options.durationMs === undefined ? DEFAULT_DURATION_MS : options.durationMs

  const latest = useLatest({ message, options, paused })
  const progress = useLatest(shown?.options.progress)
  // Stable, so WavyProgress keeps one frame loop across updates and reads the newest progress.
  const clock = useCallback(() => {
    const p = progress.current
    return p?.clock ? p.clock() : (p?.value ?? 0)
  }, [progress])

  // Show or raise once per message (seq), never for an update of the same message.
  useLayoutEffect(() => {
    const p = el.current
    if (!p || !visible) return
    clearExit(p)
    // Re-showing moves it to the top of the top layer (above a dialog opened meanwhile).
    if (p.matches(':popover-open')) p.hidePopover()
    p.showPopover()
    const { message: text, options: o } = latest.current
    announce(o.actions ? `${text}. ${o.actions.map((a) => a.label).join(', ')}` : (text ?? ''))
  }, [visible, seq, latest])

  // Dismissal: restarts for a new message or a changed duration, keeps its remainder otherwise.
  const timer = useRef<Countdown | null>(null)
  useEffect(() => {
    if (!visible || durationMs === null) return
    const c = countdown(durationMs, () => hideToast(seq))
    timer.current = c
    if (!latest.current.paused) c.run()
    return () => {
      c.pause()
      timer.current = null
    }
  }, [visible, seq, durationMs, latest])

  useEffect(() => {
    if (paused) timer.current?.pause()
    else timer.current?.run()
  }, [paused])

  // An update can remove the focused action; the browser then moves focus without a blur event.
  useLayoutEffect(() => {
    if (focus && !el.current?.contains(document.activeElement)) setFocus(false)
  }, [focus, shown])

  // One pause per message; released when interaction ends, on replacement, on hide and on unmount.
  useEffect(() => {
    if (!interacting) return
    const onChange = latest.current.options.onInteractionChange
    onChange?.(true)
    return () => onChange?.(false)
  }, [interacting, seq, latest])

  // Hide with the exit motion, then drop the content.
  useEffect(() => {
    const p = el.current
    if (visible || !shown || !p) return
    if (!p.matches(':popover-open')) {
      setShown(null)
      return
    }
    const ctl = new AbortController()
    void closeTopLayer(p, () => p.hidePopover(), ctl.signal).then((completed) => {
      if (completed) setShown(null)
    })
    return () => ctl.abort()
  }, [visible, shown])

  const runAction = (action: ToastAction) => {
    const now = toastStore.get()
    // A click that lands on an exiting or replaced message, or while an action runs, does nothing.
    if (now.message === null || now.seq !== shown?.seq || busy) return
    const id = now.seq
    if (action.dismiss === false) {
      setPending(id)
      void settle(action).then(() => setPending((p) => (p === id ? null : p)))
      return
    }
    // Hide first: the action may show a toast of its own (e.g. «Восстановлено»).
    hideToast(id)
    void settle(action)
  }

  const o = shown?.options
  const top = (o?.placement ?? placement) === 'top'
  const style = {
    ...(bottomOffset !== undefined && { '--m3e-snackbar-offset': `${bottomOffset}px` }),
    ...(topOffset !== undefined && { '--m3e-snackbar-top': `${topOffset}px` }),
  } as CSSProperties
  return (
    <div
      ref={el}
      popover="manual"
      data-placement={top ? 'top' : 'bottom'}
      data-layout={layout}
      className={cx('m3e-snackbar', 'm3e-snackbar-surface', className)}
      style={style}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false)
      }}
    >
      {shown && o && (
        <>
          {o.icon && (
            <span data-part="icon">
              <Icon name={o.icon} size={24} />
            </span>
          )}
          <div data-part="body">
            {/* Keyed by message: a replacing message fades in, an update swaps the text in place. */}
            <span key={shown.seq} data-part="message" title={shown.message}>{shown.message}</span>
            {o.progress && (
              <span
                data-part="progress"
                role="progressbar"
                aria-label={o.progress.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(1, Math.max(0, o.progress.value)) * 100)}
                className={paused ? 'm3e-wavy-idle' : undefined}
              >
                <WavyProgress value={o.progress.value} clock={clock} animated amp={2} len={20} stroke={4} />
              </span>
            )}
          </div>
          {o.actions && (
            <div data-part="actions">
              {o.actions.map((a) => (
                <Button
                  key={a.label}
                  size="md"
                  variant={a.variant ?? 'text'}
                  className="type-emph"
                  aria-disabled={busy || undefined}
                  onClick={() => runAction(a)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
