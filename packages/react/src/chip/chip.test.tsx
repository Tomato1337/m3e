// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StatusChip } from './StatusChip.tsx'

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

describe('StatusChip', () => {
  it('defaults to a small neutral pill', () => {
    render(<StatusChip>не настроено</StatusChip>)
    const chip = host.querySelector('span')!
    expect(chip.className).toBe('m3e-status-chip')
    expect(chip.dataset.tone).toBe('neutral')
    expect(chip.dataset.size).toBe('sm')
    expect(chip.textContent).toBe('не настроено')
    expect(chip.hasAttribute('role')).toBe(false)
  })

  it('takes a tone, a size and a decorative icon', () => {
    render(<StatusChip tone="error" size="md" icon="error" title="Ключ не задан">ошибка</StatusChip>)
    const chip = host.querySelector('.m3e-status-chip')!
    expect(chip.getAttribute('data-tone')).toBe('error')
    expect(chip.getAttribute('data-size')).toBe('md')
    expect(chip.getAttribute('title')).toBe('Ключ не задан')
    const icon = chip.querySelector('.m3e-icon')!
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.textContent).toBe('error')
  })
})
