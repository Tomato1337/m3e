// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Card } from './Card.tsx'

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

describe('Card', () => {
  it('is a filled section with an optional heading and name', () => {
    render(
      <Card title="Anki" label="Настройки Anki" className="extra" id="anki">
        <p>Колода</p>
      </Card>,
    )
    const card = host.querySelector('section')!
    expect(card.className).toBe('m3e-card extra')
    expect(card.id).toBe('anki')
    expect(card.dataset.variant).toBe('filled')
    expect(card.getAttribute('aria-label')).toBe('Настройки Anki')
    expect(card.hasAttribute('title')).toBe(false)
    const h = card.firstElementChild!
    expect([h.tagName, h.getAttribute('data-part'), h.textContent]).toEqual(['H3', 'title', 'Anki'])
    expect(card.lastElementChild!.textContent).toBe('Колода')
  })

  it('has no heading or name unless given, and takes the outlined variant', () => {
    render(<Card variant="outlined">Поля</Card>)
    const card = host.querySelector('section')!
    expect(card.dataset.variant).toBe('outlined')
    expect(card.hasAttribute('aria-label')).toBe(false)
    expect(card.querySelector('h3')).toBeNull()
  })
})
