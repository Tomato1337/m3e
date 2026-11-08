// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Snackbar } from './Snackbar.tsx'
import { hideToast, toast, updateToast } from './toast.ts'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// jsdom has no popover API: track which popovers are open and how often one is (re)shown.
const openPopovers = new WeakSet<Element>()
const shows = vi.fn()
const nativeMatches = Element.prototype.matches

beforeAll(() => {
  HTMLElement.prototype.showPopover = function (this: HTMLElement) {
    openPopovers.add(this)
    shows()
  }
  HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
    openPopovers.delete(this)
  }
  Element.prototype.matches = function (this: Element, selector: string) {
    return selector === ':popover-open' ? openPopovers.has(this) : nativeMatches.call(this, selector)
  } as typeof nativeMatches
})

afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover')
  Element.prototype.matches = nativeMatches
})

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers()
  shows.mockClear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(<Snackbar />))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  hideToast()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const run = (fn: () => void) => act(async () => { fn() })
const snackbar = () => host.querySelector<HTMLElement>('.m3e-snackbar')!
const isOpen = () => openPopovers.has(snackbar())
const message = () => snackbar().querySelector('[data-part="message"]')
const button = (label: string) => Array.from(snackbar().querySelectorAll('button')).find((b) => b.textContent === label)!
const announced = () => document.body.querySelector('[data-m3e-announcer]')?.textContent
// React derives pointer enter/leave from pointerover/pointerout crossing the element's boundary.
const pointer = (type: 'pointerover' | 'pointerout') =>
  run(() => snackbar().dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: document.body })))

describe('Snackbar', () => {
  it('updates the current message in place: no new entry, announcement or dismissal timer', async () => {
    let id = 0
    await run(() => { id = toast('«excited» — добавление через 5 с', { durationMs: 4000 }) })
    await tick(200)
    expect(isOpen()).toBe(true)
    expect(announced()).toBe('«excited» — добавление через 5 с')
    const node = message()

    await tick(2800)
    await run(() => updateToast(id, { message: '«excited» — добавление через 2 с', options: { progress: { value: 0.4, label: 'Время на отмену' } } }))
    await tick(200)
    expect(message()?.textContent).toBe('«excited» — добавление через 2 с')
    expect(message()).toBe(node)
    expect(snackbar().querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40')
    expect(shows).toHaveBeenCalledTimes(1)
    expect(announced()).toBe('«excited» — добавление через 5 с')

    await tick(799)
    expect(isOpen()).toBe(true)
    await tick(1)
    expect(isOpen()).toBe(false)
  })

  it('restarts the countdown only when an update changes durationMs; null never dismisses', async () => {
    let id = 0
    await run(() => { id = toast('Генерация картинки', { durationMs: null }) })
    await tick(60_000)
    expect(isOpen()).toBe(true)

    await run(() => updateToast(id, { message: 'Карточка добавлена', options: { durationMs: 10_000 } }))
    await tick(9_000)
    await run(() => updateToast(id, { options: { durationMs: 10_000, icon: 'check' } }))
    await tick(999)
    expect(isOpen()).toBe(true)
    await tick(1)
    expect(isOpen()).toBe(false)
  })

  it('ignores a stale id: an old timer, hide or update never touches a newer message', async () => {
    let first = 0
    let second = 0
    await run(() => { first = toast('Удалено из недавних', { durationMs: 4000 }) })
    await tick(3000)
    await run(() => { second = toast('Восстановлено', { durationMs: 4000 }) })
    await run(() => {
      hideToast(first)
      updateToast(first, { message: 'Удалено из недавних' })
    })
    await tick(1500)
    expect(isOpen()).toBe(true)
    expect(message()?.textContent).toBe('Восстановлено')

    await run(() => hideToast(second))
    expect(isOpen()).toBe(false)
  })

  it('pauses once while hovered or focused and resumes the remaining time when both have left', async () => {
    const onInteractionChange = vi.fn()
    await run(() => {
      toast('Карточка добавлена', { durationMs: 4000, actions: [{ label: 'Редактировать', run: () => {} }], onInteractionChange })
    })
    await tick(1000)

    await pointer('pointerover')
    expect(onInteractionChange.mock.calls).toEqual([[true]])
    await tick(10_000)
    await run(() => button('Редактировать').focus())
    await pointer('pointerout')
    await tick(10_000)
    expect(isOpen()).toBe(true)
    expect(onInteractionChange.mock.calls).toEqual([[true]])

    await run(() => button('Редактировать').blur())
    expect(onInteractionChange.mock.calls).toEqual([[true], [false]])
    await tick(2999)
    expect(isOpen()).toBe(true)
    await tick(1)
    expect(isOpen()).toBe(false)
  })

  it('resumes when an update removes the focused action (no blur fires for a removed element)', async () => {
    let id = 0
    const cancel = vi.fn(() => updateToast(id, { message: 'Добавление отменено', options: { durationMs: 4000, actions: undefined } }))
    await run(() => {
      id = toast('«excited» — добавление через 5 с', { durationMs: null, actions: [{ label: 'Отменить', dismiss: false, run: cancel }] })
    })
    const action = button('Отменить')
    // Browsers drop focus from a removed element silently; jsdom would fire focusout, so mute it.
    action.addEventListener('focusout', (e) => e.stopImmediatePropagation(), { capture: true })
    await run(() => action.focus())
    await run(() => action.click())
    await tick(0)
    expect(message()?.textContent).toBe('Добавление отменено')
    await tick(3999)
    expect(isOpen()).toBe(true)
    await tick(1)
    expect(isOpen()).toBe(false)
  })

  it('releases the interaction of a replaced message and of an unmounted host', async () => {
    const first = vi.fn()
    const second = vi.fn()
    await run(() => { toast('Задача 1', { durationMs: null, onInteractionChange: first }) })
    await pointer('pointerover')
    await run(() => { toast('Задача 2', { durationMs: null, onInteractionChange: second }) })
    expect(first.mock.calls).toEqual([[true], [false]])
    expect(second.mock.calls).toEqual([[true]])

    act(() => root.unmount())
    expect(second.mock.calls).toEqual([[true], [false]])
    root = createRoot(host)
  })

  it('lets a dismiss:false action finish before anything can hide the message', async () => {
    let id = 0
    let ack!: () => void
    const cancel = vi.fn(() => new Promise<void>((resolve) => { ack = resolve }).then(() => hideToast(id)))
    const edit = vi.fn()
    await run(() => {
      id = toast('«excited» — добавление через 5 с', {
        durationMs: 4000,
        actions: [
          { label: 'Отменить', dismiss: false, run: cancel },
          { label: 'Редактировать', variant: 'tonal', dismiss: false, run: edit },
        ],
      })
    })
    await tick(3000)
    await run(() => button('Отменить').click())
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(button('Отменить').getAttribute('aria-disabled')).toBe('true')
    expect(button('Редактировать').getAttribute('aria-disabled')).toBe('true')

    await run(() => {
      button('Отменить').click()
      button('Редактировать').click()
    })
    await tick(10_000)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(edit).not.toHaveBeenCalled()
    expect(isOpen()).toBe(true)

    await run(() => ack())
    await tick(0)
    expect(isOpen()).toBe(false)
  })

  it('keeps the message when a dismiss:false action rejects, reports it and unlocks the buttons', async () => {
    const reportError = vi.fn()
    vi.stubGlobal('reportError', reportError)
    const failure = new Error('Anki не отвечает')
    await run(() => {
      toast('«excited» — добавление через 5 с', {
        durationMs: null,
        actions: [{ label: 'Отменить', dismiss: false, run: () => Promise.reject(failure) }],
      })
    })
    await run(() => button('Отменить').click())
    await tick(0)
    expect(isOpen()).toBe(true)
    expect(reportError).toHaveBeenCalledWith(failure)
    expect(button('Отменить').hasAttribute('aria-disabled')).toBe(false)
  })

  it('hides before an ordinary action runs, so the action can show a message of its own', async () => {
    await run(() => { toast('Удалено из недавних', { actions: [{ label: 'Отменить', run: () => { toast('Восстановлено') } }] }) })
    await run(() => button('Отменить').click())
    await tick(0)
    expect(isOpen()).toBe(true)
    expect(message()?.textContent).toBe('Восстановлено')
  })

  it('moves the actions below the message under 480 px and stacks them under 320 px', async () => {
    let width = 1280
    const listeners = new Set<() => void>()
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return width < Number(/width < (\d+)px/.exec(query)?.[1])
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }))
    const resize = (w: number) => run(() => {
      width = w
      listeners.forEach((l) => l())
    })
    // The query is read when the host mounts.
    act(() => root.unmount())
    root = createRoot(host)
    act(() => root.render(<Snackbar />))
    await run(() => {
      toast('«excited» — добавление через 5 с', {
        durationMs: null,
        actions: [{ label: 'Отменить', run: () => {} }, { label: 'Редактировать', run: () => {} }],
      })
    })
    expect(snackbar().dataset.layout).toBe('inline')
    expect(snackbar().querySelectorAll('[data-part="actions"] > button')).toHaveLength(2)

    await resize(400)
    expect(snackbar().dataset.layout).toBe('below')
    await resize(300)
    expect(snackbar().dataset.layout).toBe('stacked')
    await resize(800)
    expect(snackbar().dataset.layout).toBe('inline')
  })
})
