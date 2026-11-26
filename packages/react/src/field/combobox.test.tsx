// @vitest-environment jsdom
import { act, createRef, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Combobox, type ComboboxOption } from './Combobox.tsx'
import { Dialog } from '../dialog/Dialog.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const OPTIONS: ComboboxOption[] = [
  { value: '', label: 'Как основная' },
  { value: 'anthropic/claude-haiku-5-5', label: 'claude-haiku-5-5', group: 'Anthropic', keywords: 'fast' },
  { value: 'anthropic/claude-sonnet-5-5', label: 'claude-sonnet-5-5', group: 'Anthropic', disabled: true },
  { value: 'openai/gpt-5-mini', label: 'gpt-5-mini', group: 'OpenAI', hint: 'быстрая' },
  { value: 'openrouter/deepseek-v4', label: 'deepseek-v4', group: 'OpenRouter' },
]

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  Element.prototype.getAnimations = () => []
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const render = (node: ReactNode) => act(() => root.render(node))
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const el = <T extends HTMLElement = HTMLElement>(selector: string) => host.querySelector<T>(selector)!

function setInputValue(input: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function Harness({
  initial = 'anthropic/claude-haiku-5-5',
  options = OPTIONS,
  searchable = true,
  allowCustom = false,
  onSelect,
  action,
}: {
  initial?: string
  options?: ComboboxOption[]
  searchable?: boolean | number
  allowCustom?: boolean
  onSelect?: (v: string) => void
  action?: { label: string; onSelect: () => void }
}) {
  const [val, setVal] = useState(initial)
  return (
    <Combobox
      label="Модель"
      hint="Выберите модель из списка"
      variant="outlined"
      name="model"
      value={val}
      options={options}
      searchable={searchable}
      allowCustom={allowCustom}
      action={action}
      onChange={(next) => {
        setVal(next)
        onSelect?.(next)
      }}
    />
  )
}

describe('Combobox', () => {
  it('wires label, hint, error, variant, ref, and hidden form input', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Combobox
        ref={ref}
        label="Провайдер"
        hint="Из конфига агента"
        variant="outlined"
        name="provider"
        value=""
        options={OPTIONS}
        onChange={() => {}}
      />,
    )
    const trigger = ref.current!
    expect(trigger).toBe(el('button.m3e-combobox-trigger'))
    expect(trigger.className).toContain('m3e-input')
    expect(trigger.dataset.variant).toBe('outlined')
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.labels?.[0]?.textContent).toBe('Провайдер')
    expect(trigger.textContent).toBe('Как основная')
    expect(el<HTMLInputElement>('input[type="hidden"]').name).toBe('provider')

    render(
      <Combobox
        ref={ref}
        label="Провайдер"
        hint="Из конфига агента"
        error="Обязательное поле"
        variant="outlined"
        value="missing/id"
        formatMissing={(v) => `${v} (нет в списке)`}
        options={OPTIONS}
        onChange={() => {}}
      />,
    )
    expect(trigger.getAttribute('aria-invalid')).toBe('true')
    expect(trigger.textContent).toBe('missing/id (нет в списке)')
    expect(el('[data-part="error"]').textContent).toBe('Обязательное поле')
  })

  it('opens on click, filters across groups/labels/keywords with multi-token query, and selects an option', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    const trigger = el<HTMLButtonElement>('button.m3e-combobox-trigger')
    act(() => trigger.click())

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const search = el<HTMLInputElement>('input[role="combobox"]')
    expect(document.activeElement).toBe(search)
    expect(host.querySelectorAll('[role="group"]')).toHaveLength(3)
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(5)

    // Multi-token search across group + hint.
    setInputValue(search, 'openai быстрая')
    const filtered = host.querySelectorAll('[role="option"]')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.textContent).toContain('gpt-5-mini')

    act(() => {
      (filtered[0] as HTMLElement).click()
    })
    await flush()

    expect(onSelect).toHaveBeenCalledWith('openai/gpt-5-mini')
    expect(trigger.textContent).toBe('gpt-5-mini')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })

  it('navigates with arrow keys skipping disabled options, respects IME composition on Enter, and closes on Escape without bubbling', async () => {
    const onSelect = vi.fn()
    const parentEscape = vi.fn()
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') parentEscape(e)
    }
    document.addEventListener('keydown', onDocKey)
    try {
      render(<Harness initial="anthropic/claude-haiku-5-5" onSelect={onSelect} />)
      const trigger = el<HTMLButtonElement>('button.m3e-combobox-trigger')
      act(() => trigger.click())

      const search = el<HTMLInputElement>('input[role="combobox"]')
      // Selected item is index 1 (claude-haiku-5-5); index 2 (claude-sonnet-5-5) is disabled, so ArrowDown skips to index 3 (gpt-5-mini).
      act(() => {
        search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      })
      const activeId = search.getAttribute('aria-activedescendant')!
      expect(document.getElementById(activeId)?.textContent).toContain('gpt-5-mini')

      // IME-composing Enter must not select.
      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        Object.defineProperty(ev, 'isComposing', { value: true })
        search.dispatchEvent(ev)
      })
      expect(onSelect).not.toHaveBeenCalled()

      // WebKit bug 165004 (keyCode 229) must not select.
      act(() => {
        const ev = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true })
        search.dispatchEvent(ev)
      })
      expect(onSelect).not.toHaveBeenCalled()

      // Escape closes one level at a time (stopPropagation keeps dialog/page Escape untouched).
      act(() => {
        search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      })
      await flush()
      expect(parentEscape).not.toHaveBeenCalled()
      expect(host.querySelector('.m3e-combobox-popover')).toBeNull()
      expect(document.activeElement).toBe(trigger)

      // Typing a printable key on the closed trigger opens and seeds the search query.
      act(() => {
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }))
      })
      const search2 = el<HTMLInputElement>('input[role="combobox"]')
      expect(search2.value).toBe('v')
      act(() => {
        search2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      })
      await flush()
      expect(onSelect).toHaveBeenCalledWith('openrouter/deepseek-v4')
    } finally {
      document.removeEventListener('keydown', onDocKey)
    }
  })

  it('supports allowCustom, empty state, searchable threshold, and footer action', async () => {
    const onSelect = vi.fn()
    const onAction = vi.fn()
    render(<Harness allowCustom onSelect={onSelect} action={{ label: 'Другая модель…', onSelect: onAction }} />)

    act(() => el<HTMLButtonElement>('button.m3e-combobox-trigger').click())
    const search = el<HTMLInputElement>('input[role="combobox"]')
    setInputValue(search, 'custom/my-model')

    const opts = host.querySelectorAll('[role="option"]')
    expect(opts).toHaveLength(1)
    expect(opts[0]!.textContent).toContain('Использовать «custom/my-model»')
    act(() => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await flush()
    expect(onSelect).toHaveBeenCalledWith('custom/my-model')

    // Numeric searchable threshold hides search box when list is shorter than threshold.
    render(<Harness searchable={10} onSelect={onSelect} action={{ label: 'Другая модель…', onSelect: onAction }} />)
    act(() => el<HTMLButtonElement>('button.m3e-combobox-trigger').click())
    expect(host.querySelector('input[role="combobox"]')).toBeNull()
    act(() => el<HTMLButtonElement>('.m3e-combobox-action').click())
    await flush()
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('dismisses on outside pointerdown', async () => {
    render(<Harness />)
    act(() => el<HTMLButtonElement>('button.m3e-combobox-trigger').click())
    expect(host.querySelector('.m3e-combobox-popover')).not.toBeNull()

    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })
    await flush()
    expect(host.querySelector('.m3e-combobox-popover')).toBeNull()
  })

  it('virtualizes 1,000+ grouped options with bounded DOM rows, search filtering, and keyboard navigation', async () => {
    const bigOptions: ComboboxOption[] = Array.from({ length: 1000 }, (_, i) => ({
      value: `grp-${Math.floor(i / 100)}/item-${String(i).padStart(3, '0')}`,
      label: `Option ${String(i).padStart(3, '0')}`,
      group: `Group ${Math.floor(i / 100)}`,
    }))
    const onSelect = vi.fn()
    render(<Harness initial="grp-0/item-000" options={bigOptions} onSelect={onSelect} />)

    const trigger = el<HTMLButtonElement>('button.m3e-combobox-trigger')
    act(() => trigger.click())

    const popover = el('.m3e-combobox-popover')
    expect(popover.hasAttribute('data-virtual')).toBe(true)
    const listbox = el('[data-part="listbox"]')
    const initialOptions = listbox.querySelectorAll('[role="option"]')
    expect(initialOptions.length).toBeGreaterThan(0)
    expect(initialOptions.length).toBeLessThan(40)
    expect(listbox.children.length).toBeLessThan(60)
    expect(initialOptions[0]!.getAttribute('aria-setsize')).toBe('1000')
    expect(initialOptions[0]!.getAttribute('aria-posinset')).toBe('1')

    const search = el<HTMLInputElement>('input[role="combobox"]')

    // ArrowUp from index 0 wraps to the last item (999), scrolling it into the rendered window.
    act(() => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    })
    let activeId = search.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)?.textContent).toContain('Option 999')
    expect(listbox.querySelectorAll('[role="option"]').length).toBeLessThan(40)

    // PageUp jumps back by 8 items (999 -> 991).
    act(() => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }))
    })
    activeId = search.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)?.textContent).toContain('Option 991')

    // PageDown wraps/clamps forward back toward 999, ArrowDown wraps back to 0.
    act(() => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }))
    })
    activeId = search.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)?.textContent).toContain('Option 999')

    act(() => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    activeId = search.getAttribute('aria-activedescendant')!
    expect(document.getElementById(activeId)?.textContent).toContain('Option 000')

    // Search filters across all 1,000 items accurately.
    setInputValue(search, 'Option 742')
    expect(el('[data-part="count"]').textContent).toBe('1 / 1000')
    const filtered = listbox.querySelectorAll('[role="option"]')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.textContent).toContain('Option 742')

    act(() => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await flush()
    expect(onSelect).toHaveBeenCalledWith('grp-7/item-742')
    expect(trigger.textContent).toBe('Option 742')

    // Non-searchable mode supports Home and End on 1,000 virtualized items.
    render(<Harness key="non-searchable" initial="grp-5/item-500" options={bigOptions} searchable={false} onSelect={onSelect} />)
    act(() => el<HTMLButtonElement>('button.m3e-combobox-trigger').click())
    const list2 = el('[data-part="listbox"]')
    expect(list2.querySelectorAll('[role="option"]').length).toBeLessThan(40)
    expect(document.getElementById(list2.getAttribute('aria-activedescendant')!)?.textContent).toContain('Option 500')

    act(() => {
      list2.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(document.getElementById(list2.getAttribute('aria-activedescendant')!)?.textContent).toContain('Option 999')

    act(() => {
      list2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    })
    expect(document.getElementById(list2.getAttribute('aria-activedescendant')!)?.textContent).toContain('Option 000')
  })

  it('tracks listbox scroll overflow attributes across top, middle, and bottom', () => {
    render(<Harness />)
    act(() => el<HTMLButtonElement>('button.m3e-combobox-trigger').click())
    const list = el('[data-part="listbox"]')

    let scrollTopVal = 0
    Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => 200 })
    Object.defineProperty(list, 'scrollHeight', { configurable: true, get: () => 500 })
    Object.defineProperty(list, 'scrollTop', {
      configurable: true,
      get: () => scrollTopVal,
      set: (v: number) => { scrollTopVal = v },
    })

    act(() => { list.dispatchEvent(new Event('scroll')) })
    expect(list.hasAttribute('data-overflow-top')).toBe(false)
    expect(list.hasAttribute('data-overflow-bottom')).toBe(true)

    scrollTopVal = 120
    act(() => { list.dispatchEvent(new Event('scroll')) })
    expect(list.hasAttribute('data-overflow-top')).toBe(true)
    expect(list.hasAttribute('data-overflow-bottom')).toBe(true)

    scrollTopVal = 300
    act(() => { list.dispatchEvent(new Event('scroll')) })
    expect(list.hasAttribute('data-overflow-top')).toBe(true)
    expect(list.hasAttribute('data-overflow-bottom')).toBe(false)
  })

  it('closes only Combobox on first Escape inside Dialog (Chromium CloseWatcher & WebKitGTK), and closes Dialog on second Escape', async () => {
    const openPopovers = new WeakSet<Element>()
    const nativeMatches = Element.prototype.matches
    const showModalDesc = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
    const closeDesc = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
    const showPopoverDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
    const hidePopoverDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
    const restoreProp = (proto: object, key: string, desc: PropertyDescriptor | undefined) => {
      if (desc) Object.defineProperty(proto, key, desc)
      else Reflect.deleteProperty(proto, key)
    }

    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false
    }
    HTMLElement.prototype.showPopover = function (this: HTMLElement) {
      openPopovers.add(this)
    }
    HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
      openPopovers.delete(this)
    }
    Element.prototype.matches = function (this: Element, selector: string) {
      return selector === ':popover-open' ? openPopovers.has(this) : nativeMatches.call(this, selector)
    } as typeof nativeMatches

    try {
      const onDialogClose = vi.fn()
      function DialogWithCombobox() {
        const [dialogOpen, setDialogOpen] = useState(true)
        const [val, setVal] = useState('openai/gpt-5-mini')
        return (
          <Dialog
            open={dialogOpen}
            dismissible
            label="Настройка"
            onClose={() => {
              onDialogClose()
              setDialogOpen(false)
            }}
          >
            <Combobox label="Модель" value={val} options={OPTIONS} onChange={setVal} />
          </Dialog>
        )
      }

      // Case 1: Chromium CloseWatcher fires dialog cancel on Escape keyup AFTER hidePopover() ran on keydown.
      render(<DialogWithCombobox />)
      const dialog = el<HTMLDialogElement>('dialog.m3e-dialog')
      const trigger = el<HTMLButtonElement>('button.m3e-combobox-trigger')
      expect(dialog.open).toBe(true)
      expect(dialog.getAttribute('closedby')).toBe('any')

      act(() => trigger.click())
      const search = el<HTMLInputElement>('input[role="combobox"]')
      expect(host.querySelector('.m3e-combobox-popover')).not.toBeNull()

      act(() => {
        search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      })
      await flush()
      expect(host.querySelector('.m3e-combobox-popover')).toBeNull()
      expect(document.activeElement).toBe(trigger)

      let cancel1!: Event
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
        cancel1 = new Event('cancel', { cancelable: true })
        dialog.dispatchEvent(cancel1)
      })
      await flush()
      expect(cancel1.defaultPrevented).toBe(true)
      expect(onDialogClose).not.toHaveBeenCalled()
      expect(dialog.open).toBe(true)

      // Second Escape closes the Dialog.
      let cancel2!: Event
      act(() => {
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
        cancel2 = new Event('cancel', { cancelable: true })
        dialog.dispatchEvent(cancel2)
      })
      await flush()
      expect(cancel2.defaultPrevented).toBe(true)
      expect(onDialogClose).toHaveBeenCalledTimes(1)
      expect(dialog.open).toBe(false)

      // Case 2: Same-tick cancel while popover is still open + WebKitGTK flow (no cancel on first Escape, second Escape closes Dialog even if popover is still closing).
      onDialogClose.mockClear()
      render(<DialogWithCombobox key="webkit-case" />)
      const dialog2 = el<HTMLDialogElement>('dialog.m3e-dialog')
      act(() => el<HTMLButtonElement>('button.m3e-combobox-trigger').click())
      const search2 = el<HTMLInputElement>('input[role="combobox"]')

      // Synchronous cancel before Combobox unmounts is still suppressed.
      let sameTickCancel!: Event
      act(() => {
        sameTickCancel = new Event('cancel', { cancelable: true })
        dialog2.dispatchEvent(sameTickCancel)
      })
      expect(sameTickCancel.defaultPrevented).toBe(true)
      expect(onDialogClose).not.toHaveBeenCalled()

      act(() => {
        search2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      })
      await flush()
      expect(host.querySelector('.m3e-combobox-popover')).toBeNull()
      expect(dialog2.open).toBe(true)

      act(() => {
        dialog2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        dialog2.dispatchEvent(new Event('cancel', { cancelable: true }))
      })
      await flush()
      expect(onDialogClose).toHaveBeenCalledTimes(1)
      expect(dialog2.open).toBe(false)
    } finally {
      restoreProp(HTMLDialogElement.prototype, 'showModal', showModalDesc)
      restoreProp(HTMLDialogElement.prototype, 'close', closeDesc)
      restoreProp(HTMLElement.prototype, 'showPopover', showPopoverDesc)
      restoreProp(HTMLElement.prototype, 'hidePopover', hidePopoverDesc)
      Element.prototype.matches = nativeMatches
    }
  })
})
