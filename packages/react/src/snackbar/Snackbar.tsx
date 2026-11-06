import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { announce } from '../a11y/announce'
import { cx } from '../cx'
import { clearExit } from '../presence/exit'
import { closeTopLayer } from '../presence/topLayer'
import { hideToast, useToast, type ToastOptions } from './toast'

type Shown = { message: string; options: ToastOptions; seq: number }

/**
 * The app's single M3 snackbar, fed by `toast()`. A manual popover, so it renders in the top layer
 * above everything — including a modal dialog opened before it (it is re-shown per message to stay
 * the topmost layer). Content outside an open modal dialog is inert, so its action is only clickable
 * once the dialog closes. Enter and exit animate (see snackbar.css); the timer runs in script.
 *
 * Screen readers hear the message through `announce()`, whose live region follows an open modal
 * dialog — a live region on this popover would be inert, and silent, behind one.
 */
export function Snackbar({ bottomOffset, className }: {
  /** Distance from the bottom edge, e.g. to clear other floating UI. */
  bottomOffset?: number
  className?: string
}) {
  const { message, options, seq } = useToast()
  const [shown, setShown] = useState<Shown | null>(null)
  const el = useRef<HTMLDivElement>(null)

  if (message !== null && shown?.seq !== seq) setShown({ message, options, seq })

  // Show or raise, and run the timer.
  useLayoutEffect(() => {
    const p = el.current
    if (!p || message === null) return
    clearExit(p)
    // Re-showing moves it to the top of the top layer (above a dialog opened meanwhile).
    if (p.matches(':popover-open')) p.hidePopover()
    p.showPopover()
    announce(options.action ? `${message}. ${options.action.label}` : message)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per message (seq), not per options object
  }, [message, seq])

  useEffect(() => {
    if (message === null) return
    const t = setTimeout(hideToast, options.durationMs ?? 4000)
    return () => clearTimeout(t)
  }, [message, seq, options.durationMs])

  // Hide with the exit motion, then drop the content.
  useEffect(() => {
    const p = el.current
    if (message !== null || !shown || !p) return
    if (!p.matches(':popover-open')) {
      setShown(null)
      return
    }
    const ctl = new AbortController()
    void closeTopLayer(p, () => p.hidePopover(), ctl.signal).then((completed) => {
      if (completed) setShown(null)
    })
    return () => ctl.abort()
  }, [message, shown])

  const top = shown?.options.placement === 'top'
  return (
    <div
      ref={el}
      popover="manual"
      data-placement={top ? 'top' : 'bottom'}
      className={cx('m3e-snackbar', className)}
      style={bottomOffset !== undefined ? ({ '--m3e-snackbar-offset': `${bottomOffset}px` } as CSSProperties) : undefined}
    >
      {shown && (
        <>
          {/* Keyed by message: a replacing message fades in instead of swapping text in place. */}
          <span key={shown.seq} data-part="message">{shown.message}</span>
          {shown.options.action && (
            <button
              type="button"
              className="m3e-snackbar-action"
              onClick={() => {
                // Hide first: the action may show a toast of its own (e.g. «Восстановлено»).
                hideToast()
                shown.options.action?.run()
              }}
            >
              {shown.options.action.label}
            </button>
          )}
        </>
      )}
    </div>
  )
}
