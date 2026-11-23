// @vitest-environment jsdom
import { act, createRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ListGroup } from './ListGroup.tsx'

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

describe('ListGroup', () => {
  it('renders a div with .m3e-list-group by default and forwards ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <ListGroup ref={ref} className="settings-list" aria-label="Настройки">
        <div>Пункт 1</div>
        <div>Пункт 2</div>
      </ListGroup>,
    )
    const list = el('.m3e-list-group')
    expect(ref.current).toBe(list)
    expect(list.tagName).toBe('DIV')
    expect(list.className).toBe('m3e-list-group settings-list')
    expect(list.getAttribute('aria-label')).toBe('Настройки')
    expect(list.children).toHaveLength(2)
  })

  it('supports as="ul" and forwards ul ref', () => {
    const ref = createRef<HTMLUListElement>()
    render(
      <ListGroup ref={ref} as="ul" data-testid="ul-group">
        <li>Один</li>
      </ListGroup>,
    )
    const list = el('[data-testid="ul-group"]')
    expect(ref.current).toBe(list)
    expect(list.tagName).toBe('UL')
    expect(list.className).toBe('m3e-list-group')
    expect(list.children).toHaveLength(1)
  })
})
