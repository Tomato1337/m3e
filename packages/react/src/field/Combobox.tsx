import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
} from 'react'
import { Icon } from '../icon/Icon.tsx'
import { clearExit } from '../presence/exit.ts'
import { usePresenceParticipant } from '../presence/Presence.tsx'
import { closeTopLayer, hidePopover, isPopoverOpen, markEscapeConsumed, showPopover } from '../presence/topLayer.ts'
import { mergeRefs, useLatest } from '../useLatest.ts'
import { Field } from './Field.tsx'
import { useFieldControl, type FieldControlProps } from './TextField.tsx'

export type ComboboxOption = {
  value: string
  label: string
  /** Optional group heading; options with the same group are collected under one header. */
  group?: string
  /** Trailing supporting text (e.g. "нет ключа"). */
  hint?: string
  /** Extra searchable terms not rendered in the label. */
  keywords?: string
  disabled?: boolean
}

export type ComboboxAction = {
  label: string
  icon?: string
  onSelect: () => void
}

export type ComboboxProps = FieldControlProps & {
  value: string
  onChange: (value: string) => void
  options: readonly ComboboxOption[]
  /** Trigger text when no option matches an empty value. */
  placeholder?: string
  /** Placeholder and accessible name of the search box inside the popover. */
  searchPlaceholder?: string
  /** Shown when filtering matches zero options. */
  emptyText?: string
  /**
   * Show the search box inside the dropdown:
   * - `true` (default): always show search.
   * - `false`: no search box (styled M3 select popover).
   * - `number`: show search when `options.length >= searchable`.
   */
  searchable?: boolean | number
  /** Offer a selectable custom entry when the typed query does not match any option value. */
  allowCustom?: boolean
  /** Label for the custom-entry row when `allowCustom` is true. */
  customLabel?: (query: string) => string
  /** Optional pinned footer action (e.g. "Другая модель…"). */
  action?: ComboboxAction
  /** Display label for a non-empty `value` absent from `options`. Defaults to `value`. */
  formatMissing?: (value: string) => string
  disabled?: boolean
  name?: string
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  align?: 'start' | 'end'
  placement?: 'above' | 'below'
  ref?: Ref<HTMLButtonElement>
}

type RenderEntry = ComboboxOption & {
  flatIndex: number
  isCustom?: boolean
}

type Section = {
  key: string
  group?: string
  items: RenderEntry[]
}

const VIRTUAL_THRESHOLD = 100
const VIRTUAL_OVERSCAN = 6
const OPTION_HEIGHT = 36
const HEADER_HEIGHT = 24
const HEADER_DIVIDER_HEIGHT = 37
const DIVIDER_HEIGHT = 13
const LIST_PAD_TOP = 6
const LIST_PAD_BOTTOM = 8
const FALLBACK_VIEWPORT_HEIGHT = 310

type VirtualRow =
  | { kind: 'header'; key: string; group: string; divider: boolean; height: number }
  | { kind: 'divider'; key: string; height: number }
  | { kind: 'option'; key: string; entry: RenderEntry; height: number }

const supportsAnchor = () => typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('position-area', 'block-end')

function buildVirtualRows(sections: readonly Section[]) {
  const rows: VirtualRow[] = []
  const offsets: number[] = []
  const optionRowIndex: number[] = []
  let y = 0

  for (let sIdx = 0; sIdx < sections.length; sIdx += 1) {
    const sec = sections[sIdx]!
    const prevGroup = sIdx > 0 ? sections[sIdx - 1]!.group : undefined
    const needsDivider = sIdx > 0 && (Boolean(sec.group) || Boolean(prevGroup))

    if (sec.group) {
      const height = needsDivider ? HEADER_DIVIDER_HEIGHT : HEADER_HEIGHT
      offsets.push(y)
      rows.push({ kind: 'header', key: `hdr-${sec.key}`, group: sec.group, divider: needsDivider, height })
      y += height
    } else if (needsDivider) {
      offsets.push(y)
      rows.push({ kind: 'divider', key: `div-${sec.key}`, height: DIVIDER_HEIGHT })
      y += DIVIDER_HEIGHT
    }

    for (const entry of sec.items) {
      optionRowIndex[entry.flatIndex] = rows.length
      offsets.push(y)
      rows.push({
        kind: 'option',
        key: `${entry.isCustom ? 'custom' : 'opt'}-${entry.flatIndex}-${entry.value}`,
        entry,
        height: OPTION_HEIGHT,
      })
      y += OPTION_HEIGHT
    }
  }

  return {
    enabled: rows.length > VIRTUAL_THRESHOLD,
    rows,
    offsets,
    totalHeight: y,
    optionRowIndex,
  }
}

function findStartRow(offsets: readonly number[], rows: readonly VirtualRow[], scrollTop: number): number {
  let lo = 0
  let hi = rows.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (offsets[mid]! + rows[mid]!.height <= scrollTop) lo = mid + 1
    else hi = mid
  }
  return lo
}

function findEndRow(offsets: readonly number[], rows: readonly VirtualRow[], scrollBottom: number): number {
  let lo = 0
  let hi = rows.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (offsets[mid]! < scrollBottom) lo = mid
    else hi = mid - 1
  }
  return lo
}

function syncScrollCues(list: HTMLElement): void {
  const overflowTop = list.scrollTop > 1
  const overflowBottom = list.scrollTop + list.clientHeight < list.scrollHeight - 1
  list.toggleAttribute('data-overflow-top', overflowTop)
  list.toggleAttribute('data-overflow-bottom', overflowBottom)
}

function findEnabledIndex(items: readonly RenderEntry[], start: number, step: 1 | -1): number {
  const len = items.length
  if (len === 0) return -1
  for (let i = 0; i < len; i += 1) {
    const idx = ((start + i * step) % len + len) % len
    if (!items[idx]!.disabled) return idx
  }
  return -1
}

function jumpEnabledIndex(items: readonly RenderEntry[], from: number, delta: number): number {
  const len = items.length
  if (len === 0) return -1
  const clamped = Math.min(Math.max(from + delta, 0), len - 1)
  const step: 1 | -1 = delta >= 0 ? 1 : -1
  for (let idx = clamped; idx >= 0 && idx < len; idx += step) {
    if (!items[idx]!.disabled) return idx
  }
  for (let idx = clamped - step; idx >= 0 && idx < len; idx -= step) {
    if (!items[idx]!.disabled) return idx
  }
  return -1
}

/**
 * Searchable M3 select on a top-layer manual popover. Matches `.m3e-input` height and visual
 * treatment with TextField and Select; anchors with CSS Anchor Positioning or a viewport fallback
 * on WebKitGTK. Supports grouped options, multi-token filtering, IME-safe Enter selection, and
 * optional custom-value entry.
 */
export function Combobox({
  label,
  hint,
  error,
  variant = 'filled',
  className,
  value,
  onChange,
  options,
  placeholder = 'Выберите…',
  searchPlaceholder = 'Поиск…',
  emptyText = 'Ничего не найдено',
  searchable = true,
  allowCustom = false,
  customLabel,
  action,
  formatMissing,
  disabled,
  name,
  align = 'start',
  placement = 'below',
  ref,
  ...rest
}: ComboboxProps) {
  const wiring = useFieldControl(rest, hint, error, variant)
  const baseId = useId().replace(/[^A-Za-z0-9_-]/g, '_')
  const listboxId = `m3e-cb-list-${baseId}`
  const anchorName = `--m3e-cb-${baseId}`
  const optionId = (idx: number) => `m3e-cb-opt-${baseId}-${idx}`
  const groupLabelId = (idx: number) => `m3e-cb-grp-${baseId}-${idx}`

  const presence = usePresenceParticipant()
  const [open, setOpen] = useState(false)
  if (open && disabled) setOpen(false)
  const want = open && !disabled && presence.present
  const [mounted, setMounted] = useState(want)
  if (want && !mounted) setMounted(true)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT)

  const controlRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)
  const pendingScroll = useRef(false)
  const handlers = useLatest({ onChange, done: presence.done })

  const showSearch = typeof searchable === 'number' ? options.length >= searchable : searchable

  // Pre-compute lowercase haystacks once per options array so typing stays instant even at 1000+ items.
  const indexed = useMemo(
    () =>
      options.map((opt) => ({
        opt,
        haystack: `${opt.group ?? ''} ${opt.label} ${opt.value} ${opt.hint ?? ''} ${opt.keywords ?? ''}`.toLowerCase(),
      })),
    [options],
  )

  const { sections, flat, matchedCount } = useMemo(() => {
    const trimmed = query.trim()
    const tokens = trimmed ? trimmed.toLowerCase().split(/\s+/).filter(Boolean) : []
    const matched: ComboboxOption[] =
      tokens.length === 0
        ? options.slice()
        : indexed
            .filter(({ haystack }) => tokens.every((tok) => haystack.includes(tok)))
            .map(({ opt }) => opt)

    const outSections: Section[] = []
    const groupMap = new Map<string, RenderEntry[]>()
    const outFlat: RenderEntry[] = []

    const pushUngrouped = (entry: RenderEntry) => {
      const last = outSections[outSections.length - 1]
      if (last && last.group === undefined) {
        last.items.push(entry)
      } else {
        outSections.push({ key: `u-${outSections.length}`, items: [entry] })
      }
    }

    for (const opt of matched) {
      const entry: RenderEntry = { ...opt, flatIndex: outFlat.length }
      outFlat.push(entry)
      if (opt.group) {
        let list = groupMap.get(opt.group)
        if (!list) {
          list = []
          groupMap.set(opt.group, list)
          outSections.push({ key: `g-${opt.group}`, group: opt.group, items: list })
        }
        list.push(entry)
      } else {
        pushUngrouped(entry)
      }
    }

    if (allowCustom && trimmed && !options.some((o) => o.value === trimmed)) {
      const customEntry: RenderEntry = {
        value: trimmed,
        label: customLabel ? customLabel(trimmed) : `Использовать «${trimmed}»`,
        flatIndex: outFlat.length,
        isCustom: true,
      }
      outFlat.push(customEntry)
      outSections.push({ key: 'custom', items: [customEntry] })
    }

    return { sections: outSections, flat: outFlat, matchedCount: matched.length }
  }, [options, indexed, query, allowCustom, customLabel])

  const virtual = useMemo(() => buildVirtualRows(sections), [sections])

  const virtualWindow = useMemo(() => {
    if (!virtual.enabled) return null
    const totalH = virtual.totalHeight
    const maxTop = Math.max(0, totalH + LIST_PAD_TOP + LIST_PAD_BOTTOM - viewportHeight)
    const clampedTop = Math.min(Math.max(0, scrollTop), maxTop)
    const contentTop = Math.max(0, clampedTop - LIST_PAD_TOP)
    const contentBottom = clampedTop + viewportHeight
    const start = Math.max(0, findStartRow(virtual.offsets, virtual.rows, contentTop) - VIRTUAL_OVERSCAN)
    const end = Math.min(
      virtual.rows.length - 1,
      findEndRow(virtual.offsets, virtual.rows, contentBottom) + VIRTUAL_OVERSCAN,
    )
    const topSpacer = virtual.offsets[start]!
    const endRow = virtual.rows[end]!
    const bottomSpacer = Math.max(0, totalH - (virtual.offsets[end]! + endRow.height))
    return {
      rows: virtual.rows.slice(start, end + 1),
      topSpacer,
      bottomSpacer,
    }
  }, [virtual, scrollTop, viewportHeight])

  const effectiveActiveIndex = useMemo(() => {
    if (activeIndex >= 0 && activeIndex < flat.length && !flat[activeIndex]!.disabled) return activeIndex
    return findEnabledIndex(flat, 0, 1)
  }, [activeIndex, flat])

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value])
  const isPlaceholder = !selectedOption && value === ''
  const displayText = selectedOption
    ? selectedOption.label
    : value !== ''
      ? (formatMissing ? formatMissing(value) : value)
      : placeholder

  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
  }

  const openWith = (initialQuery = '') => {
    if (disabled) return
    setQuery(initialQuery)
    setOpen(true)
    if (initialQuery) {
      setActiveIndex(0)
    } else {
      const selectedIdx = flat.findIndex((o) => !o.isCustom && o.value === value && !o.disabled)
      setActiveIndex(selectedIdx >= 0 ? selectedIdx : findEnabledIndex(flat, 0, 1))
    }
    setScrollTop(0)
    pendingScroll.current = true
  }

  const selectValue = (next: string) => {
    handlers.current.onChange(next)
    close(true)
  }

  const place = () => {
    const m = popoverRef.current
    const a = controlRef.current
    if (!m || !a) return
    const r = a.getBoundingClientRect()
    const nextW = `${Math.round(r.width)}px`
    if (m.style.getPropertyValue('--m3e-combobox-trigger-width') !== nextW) {
      m.style.setProperty('--m3e-combobox-trigger-width', nextW)
    }
    if (supportsAnchor()) return

    const gap = 4
    const pad = 8
    const spaceBelow = Math.max(0, innerHeight - r.bottom - gap - pad)
    const spaceAbove = Math.max(0, r.top - gap - pad)
    const preferAbove = placement === 'above'
    let side: 'above' | 'below' = preferAbove ? 'above' : 'below'
    if (!preferAbove && spaceBelow < 240 && spaceAbove > spaceBelow) side = 'above'
    if (preferAbove && spaceAbove < 240 && spaceBelow > spaceAbove) side = 'below'

    const avail = side === 'below' ? spaceBelow : spaceAbove
    m.style.maxBlockSize = `${Math.max(140, Math.min(360, Math.floor(avail)))}px`

    const w = m.offsetWidth
    const h = m.offsetHeight
    let top = side === 'below' ? r.bottom + gap : r.top - gap - h
    let left = align === 'start' ? r.left : r.right - w
    left = Math.min(Math.max(left, pad), Math.max(pad, innerWidth - pad - w))
    top = Math.min(Math.max(top, pad), Math.max(pad, innerHeight - pad - h))
    m.style.left = `${Math.round(left)}px`
    m.style.top = `${Math.round(top)}px`
    m.dataset.side = side
  }

  // Open popover & focus search input (or listbox when search is hidden).
  useLayoutEffect(() => {
    const m = popoverRef.current
    if (!want || !m) return
    clearExit(m)
    const a = controlRef.current
    if (a) {
      m.style.setProperty('--m3e-combobox-trigger-width', `${Math.round(a.getBoundingClientRect().width)}px`)
      if (supportsAnchor()) {
        a.style.setProperty('anchor-name', anchorName)
        m.style.setProperty('position-anchor', anchorName)
      }
    }
    if (!isPopoverOpen(m)) {
      showPopover(m)
      place()
      if (showSearch) {
        const input = searchRef.current
        if (input) {
          input.focus({ preventScroll: true })
          const end = input.value.length
          input.setSelectionRange?.(end, end)
        }
      } else {
        listboxRef.current?.focus({ preventScroll: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place() reads current props
  }, [want, mounted, anchorName, showSearch])

  useLayoutEffect(() => {
    if (want) place()
  })

  // Keep the active option visible inside the listbox only (never scrolling outer page containers).
  useLayoutEffect(() => {
    if (!want || !pendingScroll.current) return
    pendingScroll.current = false
    if (effectiveActiveIndex < 0) return
    const list = listboxRef.current
    if (!list) return
    if (virtual.enabled) {
      const rowIdx = virtual.optionRowIndex[effectiveActiveIndex]
      if (rowIdx === undefined) return
      const viewH = list.clientHeight > 0 ? list.clientHeight : FALLBACK_VIEWPORT_HEIGHT
      const row = virtual.rows[rowIdx]!
      const itemTop = LIST_PAD_TOP + virtual.offsets[rowIdx]!
      const itemBottom = itemTop + row.height
      const topPad = 8
      const bottomPad = 18
      const curTop = list.scrollTop
      let nextTop = curTop
      if (effectiveActiveIndex === 0 && rowIdx === 1 && virtual.rows[0]?.kind === 'header') {
        nextTop = 0
      } else if (itemTop < curTop + topPad) {
        nextTop = Math.max(0, itemTop - topPad)
      } else if (itemBottom > curTop + viewH - bottomPad) {
        const maxTop = Math.max(0, virtual.totalHeight + LIST_PAD_TOP + LIST_PAD_BOTTOM - viewH)
        nextTop = Math.min(maxTop, itemBottom - (viewH - bottomPad))
      }
      if (Math.abs(nextTop - curTop) >= 1) list.scrollTop = nextTop
      const actualTop = list.clientHeight > 0 ? list.scrollTop : nextTop
      setScrollTop((prev) => (Math.abs(prev - actualTop) >= 1 ? actualTop : prev))
      return
    }
    const node = document.getElementById(optionId(effectiveActiveIndex))
    if (!node) return
    const lr = list.getBoundingClientRect()
    const nr = node.getBoundingClientRect()
    if (lr.height === 0) return
    const topPad = 8
    const bottomPad = list.scrollTop + list.clientHeight < list.scrollHeight - 1 ? 18 : 8
    if (nr.top < lr.top + topPad) {
      list.scrollTop -= lr.top + topPad - nr.top
    } else if (nr.bottom > lr.bottom - bottomPad) {
      list.scrollTop += nr.bottom - (lr.bottom - bottomPad)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optionId is deterministic per render
  }, [want, effectiveActiveIndex, query, virtual])

  // Sync listbox overflow edge affordances and measured viewport height for virtualization.
  useLayoutEffect(() => {
    if (!want) return
    const list = listboxRef.current
    if (!list) return
    syncScrollCues(list)
    if (virtual.enabled && list.clientHeight > 0) {
      const ch = list.clientHeight
      setViewportHeight((prev) => (prev !== ch ? ch : prev))
    }
  }, [want, virtual, query, scrollTop])

  // Close with exit animation; return focus before hiding when still inside the popover.
  useEffect(() => {
    if (want) return
    if (!mounted) {
      if (!presence.present) handlers.current.done()
      return
    }
    const m = popoverRef.current
    const finish = () => {
      setMounted(false)
      setQuery('')
      setScrollTop(0)
      handlers.current.done()
    }
    if (!m || !isPopoverOpen(m)) {
      finish()
      return
    }
    if (m.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true })
    const ctl = new AbortController()
    void closeTopLayer(m, () => hidePopover(m), ctl.signal).then((completed) => {
      if (completed) finish()
    })
    return () => ctl.abort()
  }, [want, mounted, presence.present, handlers])

  // While open: light dismiss on outside pointerdown, Escape one level at a time, reposition on viewport change.
  useEffect(() => {
    if (!want) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (popoverRef.current?.contains(t) || controlRef.current?.contains(t)) return
      close(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      markEscapeConsumed(popoverRef.current, controlRef.current)
      close(true)
    }
    let raf = 0
    const onMove = (e: Event) => {
      if (e.type === 'scroll' && popoverRef.current?.contains(e.target as Node)) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(place)
    }
    const list = listboxRef.current
    const ro =
      list && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            syncScrollCues(list)
            if (list.clientHeight > 0) {
              const ch = list.clientHeight
              setViewportHeight((prev) => (prev !== ch ? ch : prev))
            }
          })
        : null
    if (list && ro) ro.observe(list)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place() reads refs
  }, [want])

  const moveActive = (next: number) => {
    if (next < 0) return
    pendingScroll.current = true
    setActiveIndex(next)
  }

  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) openWith('')
      return
    }
    if (!open && showSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
      e.preventDefault()
      openWith(e.key)
    }
  }

  const onPopoverKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveActive(findEnabledIndex(flat, effectiveActiveIndex < 0 ? 0 : effectiveActiveIndex + 1, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveActive(findEnabledIndex(flat, effectiveActiveIndex <= 0 ? flat.length - 1 : effectiveActiveIndex - 1, -1))
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      moveActive(jumpEnabledIndex(flat, effectiveActiveIndex < 0 ? 0 : effectiveActiveIndex, 8))
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      moveActive(jumpEnabledIndex(flat, effectiveActiveIndex < 0 ? flat.length - 1 : effectiveActiveIndex, -8))
    } else if (!showSearch && e.key === 'Home') {
      e.preventDefault()
      moveActive(findEnabledIndex(flat, 0, 1))
    } else if (!showSearch && e.key === 'End') {
      e.preventDefault()
      moveActive(findEnabledIndex(flat, flat.length - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // IME guard: native isComposing plus keyCode 229 for WebKit bug 165004.
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      const item = effectiveActiveIndex >= 0 ? flat[effectiveActiveIndex] : undefined
      if (item && !item.disabled) selectValue(item.value)
    } else if (!showSearch && e.key === ' ') {
      e.preventDefault()
      const item = effectiveActiveIndex >= 0 ? flat[effectiveActiveIndex] : undefined
      if (item && !item.disabled) selectValue(item.value)
    } else if (e.key === 'Tab') {
      triggerRef.current?.focus({ preventScroll: true })
      setOpen(false)
    }
  }

  const onQueryChange = (next: string) => {
    setQuery(next)
    // Reset to top matching option on every query edit.
    setActiveIndex(0)
    setScrollTop(0)
    if (listboxRef.current) listboxRef.current.scrollTop = 0
  }

  const onListboxScroll = () => {
    const list = listboxRef.current
    if (!list) return
    syncScrollCues(list)
    if (virtual.enabled) {
      const nextTop = list.scrollTop
      setScrollTop((prev) => (Math.abs(prev - nextTop) >= 1 ? nextTop : prev))
    }
  }

  const renderOption = (entry: RenderEntry, setSize?: number) => {
    const isSelected = !entry.isCustom && entry.value === value
    const isActive = entry.flatIndex === effectiveActiveIndex && !entry.disabled
    return (
      <div
        key={`${entry.isCustom ? 'custom' : 'opt'}-${entry.flatIndex}-${entry.value}`}
        id={optionId(entry.flatIndex)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={entry.disabled || undefined}
        aria-setsize={setSize}
        aria-posinset={setSize !== undefined ? entry.flatIndex + 1 : undefined}
        data-selected={isSelected ? '' : undefined}
        data-active={isActive ? '' : undefined}
        data-custom={entry.isCustom ? '' : undefined}
        className="m3e-combobox-option"
        onPointerMove={() => {
          if (!entry.disabled && activeIndex !== entry.flatIndex) setActiveIndex(entry.flatIndex)
        }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!entry.disabled) selectValue(entry.value)
        }}
      >
        {entry.isCustom && <Icon name="add" size={18} />}
        <span data-part="label">
          {entry.label}
        </span>
        {entry.hint && <span data-part="hint">{entry.hint}</span>}
        {isSelected && (
          <span data-part="check" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
        )}
      </div>
    )
  }

  const activeEntry = effectiveActiveIndex >= 0 ? flat[effectiveActiveIndex] : undefined
  const activeOptionId = activeEntry && !activeEntry.disabled ? optionId(activeEntry.flatIndex) : undefined

  return (
    <Field label={label} hint={hint} error={error} htmlFor={wiring.id} className={className}>
      <div ref={controlRef} data-part="control">
        {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
        <button
          ref={mergeRefs(triggerRef, ref)}
          type="button"
          {...wiring}
          className="m3e-input m3e-combobox-trigger"
          data-trailing=""
          disabled={disabled}
          aria-label={rest['aria-label']}
          aria-labelledby={rest['aria-labelledby']}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={mounted ? listboxId : undefined}
          onClick={() => (open ? close(false) : openWith(''))}
          onKeyDown={onTriggerKeyDown}
        >
          <span data-part="value" data-placeholder={isPlaceholder ? '' : undefined}>
            {displayText}
          </span>
        </button>
        <span data-part="chevron" aria-hidden="true">
          <Icon name="arrow_drop_down" size={20} />
        </span>

        {mounted && (
          <div
            ref={popoverRef}
            popover="manual"
            data-align={align}
            data-placement={placement}
            data-virtual={virtual.enabled ? '' : undefined}
            className="m3e-combobox-popover"
          >
            {showSearch && (
              <div data-part="search">
                <Icon name="search" size={18} />
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded="true"
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  value={query}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="done"
                  onChange={(e) => onQueryChange(e.target.value)}
                  onKeyDown={onPopoverKeyDown}
                />
                {options.length >= 20 && query.trim() !== '' && (
                  <span data-part="count">{`${matchedCount} / ${options.length}`}</span>
                )}
                {query !== '' && (
                  <button
                    type="button"
                    data-part="clear"
                    tabIndex={-1}
                    aria-label="Очистить поиск"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onQueryChange('')
                      searchRef.current?.focus({ preventScroll: true })
                    }}
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            )}

            <div
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-label={rest['aria-label'] ?? (typeof label === 'string' ? label : undefined)}
              aria-activedescendant={!showSearch ? activeOptionId : undefined}
              tabIndex={showSearch ? undefined : -1}
              data-part="listbox"
              onScroll={onListboxScroll}
              onKeyDown={showSearch ? undefined : onPopoverKeyDown}
            >
              {sections.length === 0 ? (
                <div data-part="empty">{emptyText}</div>
              ) : virtualWindow ? (
                <>
                  {virtualWindow.topSpacer > 0 && (
                    <div role="presentation" aria-hidden="true" style={{ blockSize: `${virtualWindow.topSpacer}px` }} />
                  )}
                  {virtualWindow.rows.map((row) => {
                    if (row.kind === 'header') {
                      return (
                        <div
                          key={row.key}
                          role="presentation"
                          data-part="group-label"
                          data-divider={row.divider ? '' : undefined}
                        >
                          {row.group}
                        </div>
                      )
                    }
                    if (row.kind === 'divider') {
                      return <div key={row.key} role="presentation" data-part="divider" />
                    }
                    return renderOption(row.entry, flat.length)
                  })}
                  {virtualWindow.bottomSpacer > 0 && (
                    <div role="presentation" aria-hidden="true" style={{ blockSize: `${virtualWindow.bottomSpacer}px` }} />
                  )}
                </>
              ) : (
                sections.map((sec, sIdx) => {
                  if (sec.group) {
                    const headingId = groupLabelId(sIdx)
                    return (
                      <div key={sec.key} role="group" aria-labelledby={headingId} data-part="group">
                        <div id={headingId} data-part="group-label">
                          {sec.group}
                        </div>
                        {sec.items.map((entry) => renderOption(entry))}
                      </div>
                    )
                  }
                  return (
                    <div key={sec.key} data-part="ungrouped">
                      {sec.items.map((entry) => renderOption(entry))}
                    </div>
                  )
                })
              )}
            </div>

            {action && (
              <div data-part="footer">
                <button
                  type="button"
                  className="m3e-combobox-action"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    close(false)
                    action.onSelect()
                  }}
                >
                  {action.icon && <Icon name={action.icon} size={18} />}
                  <span data-part="label">{action.label}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Field>
  )
}
