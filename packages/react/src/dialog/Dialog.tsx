import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react'
import { cx } from '../cx.ts'
import { clearExit } from '../presence/exit.ts'
import { usePresenceParticipant } from '../presence/Presence.tsx'
import { closeTopLayer } from '../presence/topLayer.ts'
import { mergeRefs, useLatest } from '../useLatest.ts'

export type DialogProps = Omit<ComponentPropsWithoutRef<'dialog'>, 'open' | 'onClose' | 'onCancel' | 'children'> & {
  /** Defaults to true: inside `<Presence>` the dialog opens on mount and animates out on unmount. */
  open?: boolean
  /**
   * A close request: Esc, the platform back gesture, or a backdrop click when `dismissible`.
   * Set `open` to false (or unmount through Presence) in response — the exit then animates.
   * Point it at the dialog's safe action; without it, Esc does nothing.
   */
  onClose?: () => void
  /** Light dismiss: a click on the backdrop closes too. */
  dismissible?: boolean
  /** Accessible name when no visible heading is referenced by `aria-labelledby`. */
  label?: string
  /** After the exit motion, once the dialog has left the top layer. */
  onExited?: () => void
  children?: ReactNode
  ref?: Ref<HTMLDialogElement>
}

const supportsClosedBy = () => typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype

/**
 * M3 dialog on a native modal `<dialog>`: top layer, inert page, focus moved in and restored,
 * Esc as a close request — nothing re-implemented in script. Enter and exit are CSS transitions
 * (`@starting-style` in, the closed state out); see dialog.css.
 *
 * Focus goes to the element marked `data-autofocus` (put it on the safe action), else the first
 * focusable one. Do not put `display` utilities on the dialog itself — they would show it while
 * closed; lay out the content inside, or rely on the open dialog being a flex column.
 */
export function Dialog({ open = true, onClose, dismissible = false, label, onExited, className, children, ref, ...rest }: DialogProps) {
  const presence = usePresenceParticipant()
  const want = open && presence.present
  const [mounted, setMounted] = useState(want)
  if (want && !mounted) setMounted(true)

  const el = useRef<HTMLDialogElement>(null)
  const setRef = useMemo(() => mergeRefs(el, ref), [ref])
  const invoker = useRef<HTMLElement | null>(null)
  /** Set while the kit itself calls close(), to tell it from a native close. */
  const ownClose = useRef(false)
  const wantRef = useLatest(want)
  const handlers = useLatest({ onClose, onExited, done: presence.done })

  // Open: showModal() puts it in the top layer; @starting-style animates it in.
  useLayoutEffect(() => {
    const d = el.current
    if (!want || !d) return
    clearExit(d)
    if (d.open) return
    invoker.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    d.showModal()
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [want, mounted])

  // Close: exit motion first, close() after, unmount last.
  useEffect(() => {
    if (want) return
    if (!mounted) {
      if (!presence.present) handlers.current.done()
      return
    }
    const d = el.current
    const finish = () => {
      setMounted(false)
      handlers.current.done()
      handlers.current.onExited?.()
    }
    if (!d || !d.open) {
      finish()
      return
    }
    const ctl = new AbortController()
    void closeTopLayer(d, () => {
      ownClose.current = true
      d.close()
      ownClose.current = false
      // Engines restore focus to the opener on close(); this covers the ones that leave it on <body>.
      const target = invoker.current
      if (target?.isConnected && (document.activeElement === document.body || document.activeElement === null)) {
        target.focus({ preventScroll: true })
      }
    }, ctl.signal).then((completed) => {
      if (completed) finish()
    })
    return () => ctl.abort()
  }, [want, mounted, presence.present, handlers])

  const lightDismiss = dismissible && !supportsClosedBy()
  const pressedOutside = useRef(false)
  const outside = (d: HTMLDialogElement, x: number, y: number) => {
    const r = d.getBoundingClientRect()
    return x < r.left || x > r.right || y < r.top || y > r.bottom
  }

  if (!mounted) return null
  return (
    <dialog
      {...rest}
      ref={setRef}
      // Light dismiss where the engine knows `closedby`; the click handlers below cover the rest.
      {...{ closedby: dismissible ? 'any' : 'closerequest' }}
      aria-label={label ?? rest['aria-label']}
      className={cx('m3e-dialog', className)}
      onCancel={(e) => {
        // Esc / back gesture / closedby light dismiss: animate through the owner instead of closing now.
        if (e.cancelable) e.preventDefault()
        handlers.current.onClose?.()
      }}
      onClose={() => {
        if (ownClose.current) return
        // Closed natively (an uncancelable close request, a form with method="dialog").
        if (wantRef.current) {
          handlers.current.onClose?.()
          // Still wanted: the owner keeps it open, so put it back in the top layer.
          requestAnimationFrame(() => {
            const d = el.current
            if (wantRef.current && d?.isConnected && !d.open) d.showModal()
          })
        }
      }}
      onPointerDown={lightDismiss ? (e) => {
        pressedOutside.current = e.target === e.currentTarget && outside(e.currentTarget, e.clientX, e.clientY)
        rest.onPointerDown?.(e)
      } : rest.onPointerDown}
      onClick={lightDismiss ? (e) => {
        // Fallback for engines without closedby: a click on the backdrop targets the dialog itself.
        if (pressedOutside.current && e.target === e.currentTarget && outside(e.currentTarget, e.clientX, e.clientY)) {
          handlers.current.onClose?.()
        }
        pressedOutside.current = false
        rest.onClick?.(e)
      } : rest.onClick}
    >
      {children}
    </dialog>
  )
}
