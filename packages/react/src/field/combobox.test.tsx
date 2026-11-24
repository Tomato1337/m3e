// @vitest-environment jsdom
import { act, createRef, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Combobox, type ComboboxOption } from './Combobox.tsx'

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
})
