// @vitest-environment jsdom
import { act, createRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Kbd } from './Kbd.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const render = (node: ReactNode) => act(() => root.render(node))
const el = <T extends HTMLElement = HTMLElement>(selector: string) => host.querySelector<T>(selector)!

describe('Kbd', () => {
  it('renders a small <kbd> by default and forwards ref', () => {
    const ref = createRef<HTMLElement>()
    render(<Kbd ref={ref}>Space</Kbd>)
    const kbd = el('kbd')
    expect(ref.current).toBe(kbd)
    expect(kbd.className).toBe('m3e-kbd')
    expect(kbd.dataset.size).toBe('sm')
    expect(kbd.textContent).toBe('Space')
  })

  it('supports size="md", custom className and HTML attributes', () => {
    render(<Kbd size="md" className="key" title="Пауза">K</Kbd>)
    const kbd = el('kbd')
    expect(kbd.className).toBe('m3e-kbd key')
    expect(kbd.dataset.size).toBe('md')
    expect(kbd.getAttribute('title')).toBe('Пауза')
    expect(kbd.textContent).toBe('K')
  })
})
