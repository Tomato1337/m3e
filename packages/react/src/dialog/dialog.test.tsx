// @vitest-environment jsdom
import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Menu, MenuItem } from '../menu/Menu.tsx'
import { Dialog } from './Dialog.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

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

beforeAll(() => {
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
})

afterAll(() => {
  restoreProp(HTMLDialogElement.prototype, 'showModal', showModalDesc)
  restoreProp(HTMLDialogElement.prototype, 'close', closeDesc)
  restoreProp(HTMLElement.prototype, 'showPopover', showPopoverDesc)
  restoreProp(HTMLElement.prototype, 'hidePopover', hidePopoverDesc)
  Element.prototype.matches = nativeMatches
})

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

describe('Dialog', () => {
  it('closes only nested Menu on first Escape and closes Dialog on second Escape', async () => {
    const onDialogClose = vi.fn()

    function Demo() {
      const [dialogOpen, setDialogOpen] = useState(true)
      const [menuOpen, setMenuOpen] = useState(false)
      return (
        <Dialog
          open={dialogOpen}
          dismissible
          label="Действия"
          onClose={() => {
            onDialogClose()
            setDialogOpen(false)
          }}
        >
          <span>
            <button
              type="button"
              data-menu-trigger
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              Меню
            </button>
            <Menu open={menuOpen} onClose={() => setMenuOpen(false)} label="Опции">
              <MenuItem label="Копировать" onClick={() => setMenuOpen(false)} />
            </Menu>
          </span>
        </Dialog>
      )
    }

    render(<Demo />)
    const dialog = el<HTMLDialogElement>('dialog.m3e-dialog')
    const trigger = el<HTMLButtonElement>('[data-menu-trigger]')
    act(() => trigger.click())
    expect(host.querySelector('.m3e-menu')).not.toBeNull()

    // First Escape closes Menu and suppresses CloseWatcher cancel on parent Dialog.
    act(() => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await flush()
    expect(host.querySelector('.m3e-menu')).toBeNull()

    let firstCancel!: Event
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
      firstCancel = new Event('cancel', { cancelable: true })
      dialog.dispatchEvent(firstCancel)
    })
    await flush()
    expect(firstCancel.defaultPrevented).toBe(true)
    expect(onDialogClose).not.toHaveBeenCalled()
    expect(dialog.open).toBe(true)
    expect(document.activeElement).toBe(trigger)

    // Second Escape closes Dialog.
    act(() => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    })
    await flush()
    expect(onDialogClose).toHaveBeenCalledTimes(1)
    expect(dialog.open).toBe(false)
  })
})
