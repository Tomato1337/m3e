import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { cx } from '../cx.ts'
import { Icon } from '../icon/Icon.tsx'
import { clearExit } from '../presence/exit.ts'
import { usePresenceParticipant } from '../presence/Presence.tsx'
import { closeTopLayer } from '../presence/topLayer.ts'
import { SwitchIndicator } from '../switch/Switch.tsx'
import { useLatest } from '../useLatest.ts'

export type MenuProps = {
  open: boolean
  /** Outside press, Escape, Tab out. Set `open` to false in response; the exit then animates. */
  onClose: () => void
  children: ReactNode
  /** Accessible name of the menu. */
  label?: string
  /** Edge of the anchor the menu lines up with. */
  align?: 'start' | 'end'
  placement?: 'above' | 'below'
  /** Element the menu is attached to; defaults to the menu's parent element (the trigger's wrapper). */
  anchor?: RefObject<HTMLElement | null>
  className?: string
}

const ITEMS = '[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])'
const supportsAnchor = () => typeof CSS !== 'undefined' && CSS.supports('position-area', 'block-end')

/**
 * M3 menu on a manual popover: top layer (never clipped by an `overflow: hidden` parent), anchored
 * to its trigger with CSS Anchor Positioning or, where that is missing (WebKit), from script.
 *
 * `popover="manual"` because an auto popover's light dismiss cannot be intercepted, which would
 * cut the exit animation; outside press and Escape are handled here instead. Keyboard: an opening
 * by keyboard moves focus to the first item, Arrow keys/Home/End move between items, Escape closes
 * and returns focus to the trigger, Tab closes and moves on. Pointer opens leave focus on the
 * trigger (ArrowDown enters the menu).
 *
 * Give the trigger `aria-haspopup="menu"` and `aria-expanded`.
 */
export function Menu({ open, onClose, children, label, align = 'start', placement = 'below', anchor, className }: MenuProps) {
  const presence = usePresenceParticipant()
  const want = open && presence.present
  const [mounted, setMounted] = useState(want)
  if (want && !mounted) setMounted(true)

  const el = useRef<HTMLDivElement>(null)
  const anchorName = `--m3e-menu-${useId().replace(/[^A-Za-z0-9_-]/g, '_')}`
  const handlers = useLatest({ onClose, done: presence.done })
  /** How the trigger was last operated: only keyboard opens move focus into the menu. */
  const lastInput = useRef<'pointer' | 'keyboard'>('keyboard')
  const opener = useRef<HTMLElement | null>(null)

  const anchorEl = () => anchor?.current ?? el.current?.parentElement ?? null

  const trigger = () => {
    const a = anchorEl()
    const t = opener.current
    if (t && a?.contains(t)) return t
    return a?.querySelector<HTMLElement>('[data-menu-trigger], [aria-haspopup]') ?? a
  }

  const place = () => {
    const m = el.current
    const a = anchorEl()
    if (!m || !a || supportsAnchor()) return
    const r = a.getBoundingClientRect()
    const w = m.offsetWidth
    const h = m.offsetHeight
    const gap = 4
    const pad = 8
    const below = r.bottom + gap
    const above = r.top - gap - h
    let top = placement === 'below' ? below : above
    // Flip to the other side when this one would run off the window and the other fits.
    if (placement === 'below' && below + h > innerHeight - pad && above >= pad) top = above
    if (placement === 'above' && above < pad && below + h <= innerHeight - pad) top = below
    let left = align === 'start' ? r.left : r.right - w
    left = Math.min(Math.max(left, pad), Math.max(pad, innerWidth - pad - w))
    top = Math.min(Math.max(top, pad), Math.max(pad, innerHeight - pad - h))
    m.style.left = `${Math.round(left)}px`
    m.style.top = `${Math.round(top)}px`
    m.dataset.side = top < r.top ? 'above' : 'below'
  }

  // Pointer or keyboard? Only keyboard opens move focus into the menu.
  useEffect(() => {
    const a = anchor?.current ?? el.current?.parentElement
    if (!a) return
    const pointer = () => { lastInput.current = 'pointer' }
    const keyboard = () => { lastInput.current = 'keyboard' }
    a.addEventListener('pointerdown', pointer, true)
    a.addEventListener('keydown', keyboard, true)
    return () => {
      a.removeEventListener('pointerdown', pointer, true)
      a.removeEventListener('keydown', keyboard, true)
    }
  }, [anchor, mounted])

  // Open.
  useLayoutEffect(() => {
    const m = el.current
    if (!want || !m) return
    clearExit(m)
    const a = anchorEl()
    if (a && supportsAnchor()) {
      a.style.setProperty('anchor-name', anchorName)
      m.style.setProperty('position-anchor', anchorName)
    }
    if (!m.matches(':popover-open')) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      m.showPopover()
      place()
      if (lastInput.current === 'keyboard') m.querySelector<HTMLElement>(ITEMS)?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place() reads current props
  }, [want, mounted, anchorName])

  useLayoutEffect(() => {
    if (want) place()
  })

  // Close: focus back to the trigger first (never leave it in hidden content), then animate out.
  useEffect(() => {
    if (want) return
    if (!mounted) {
      if (!presence.present) handlers.current.done()
      return
    }
    const m = el.current
    const finish = () => {
      setMounted(false)
      handlers.current.done()
    }
    if (!m || !m.matches(':popover-open')) {
      finish()
      return
    }
    if (m.contains(document.activeElement)) trigger()?.focus({ preventScroll: true })
    const ctl = new AbortController()
    void closeTopLayer(m, () => m.hidePopover(), ctl.signal).then((completed) => {
      if (completed) finish()
    })
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trigger() reads refs
  }, [want, mounted, presence.present, handlers])

  // While open: light dismiss, Escape, keep in place on resize/scroll.
  useEffect(() => {
    if (!want) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (el.current?.contains(t) || anchorEl()?.contains(t)) return
      handlers.current.onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // One level at a time: not the dialog under the menu, not the page's own Escape.
      e.preventDefault()
      e.stopPropagation()
      if (el.current?.contains(document.activeElement)) trigger()?.focus({ preventScroll: true })
      handlers.current.onClose()
    }
    let raf = 0
    const onMove = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(place)
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    // ArrowDown/ArrowUp on the trigger enters an open menu.
    const a = anchorEl()
    const onTriggerKey = (e: KeyboardEvent) => {
      if (el.current?.contains(e.target as Node)) return
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const items = el.current ? Array.from(el.current.querySelectorAll<HTMLElement>(ITEMS)) : []
      const target = e.key === 'ArrowDown' ? items[0] : items[items.length - 1]
      if (!target) return
      e.preventDefault()
      target.focus()
    }
    a?.addEventListener('keydown', onTriggerKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
      a?.removeEventListener('keydown', onTriggerKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are read through refs
  }, [want])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(ITEMS))
    const i = items.indexOf(document.activeElement as HTMLElement)
    const go = (n: number) => {
      e.preventDefault()
      items[(n + items.length) % items.length]?.focus()
    }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i < 0 ? items.length - 1 : i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
    else if (e.key === 'Tab') {
      // Leave the menu: focus the trigger now, the default Tab action then moves past it.
      trigger()?.focus({ preventScroll: true })
      handlers.current.onClose()
    }
  }

  if (!mounted) return null
  return (
    <div
      ref={el}
      popover="manual"
      role="menu"
      aria-label={label}
      data-align={align}
      data-placement={placement}
      className={cx('m3e-menu', className)}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  )
}

export type MenuItemProps = {
  label: string
  onClick: () => void
  icon?: string
  /** Radio indicator (menuitemradio); undefined = none. */
  selected?: boolean
  /** Switch indicator (menuitemcheckbox); undefined = none. */
  on?: boolean
  disabled?: boolean
  /** Trailing supporting text, e.g. a shortcut. */
  hint?: string
}

export function MenuItem({ label, onClick, icon, selected, on, disabled, hint }: MenuItemProps) {
  const role = on !== undefined ? 'menuitemcheckbox' : selected !== undefined ? 'menuitemradio' : 'menuitem'
  return (
    <button type="button" role={role} tabIndex={-1} aria-checked={on ?? selected} disabled={disabled} onClick={onClick} className="m3e-menu-item">
      {selected !== undefined && <Icon name={selected ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} />}
      {icon && <Icon name={icon} size={20} />}
      <span data-part="label">{label}</span>
      {hint && <span data-part="hint">{hint}</span>}
      {on !== undefined && <SwitchIndicator checked={on} />}
    </button>
  )
}

/** A rule between groups of items, with an optional group title. */
export function MenuDivider({ title }: { title?: string }) {
  return (
    <div role="separator" className="m3e-menu-divider">
      {title && <span role="presentation">{title}</span>}
    </div>
  )
}
