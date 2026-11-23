// @vitest-environment jsdom
import { act, createRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ShapeBadge } from './ShapeBadge.tsx'
import { shapeClip } from './shapes.ts'

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

describe('ShapeBadge', () => {
  it('defaults to a 40px primary decorative circle', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<ShapeBadge ref={ref} icon="star" />)
    const badge = el('.m3e-shape-badge')
    expect(ref.current).toBe(badge)
    expect(badge.dataset.shape).toBe('circle')
    expect(badge.dataset.tone).toBe('primary')
    expect(badge.style.getPropertyValue('--m3e-badge-size')).toBe('40px')
    expect(badge.getAttribute('aria-hidden')).toBe('true')
    expect(badge.hasAttribute('role')).toBe(false)
    expect(host.querySelector('[data-part="ring"]')).toBeNull()
    const surface = el('[data-part="surface"]')
    expect(surface.style.clipPath).toBe('')
    const icon = el('.m3e-icon')
    expect(icon.textContent).toBe('star')
    expect(icon.style.fontSize).toBe('20px')
  })

  it('applies shape clip-path, ring layer, custom iconSize and iconFill', () => {
    render(
      <ShapeBadge
        shape="pentagon"
        size={56}
        tone="tertiary"
        icon="bolt"
        iconFill
        iconSize={30}
        ringColor="rgb(255, 0, 0)"
        className="custom"
      />,
    )
    const badge = el('.m3e-shape-badge')
    expect(badge.className).toBe('m3e-shape-badge custom')
    expect(badge.dataset.shape).toBe('pentagon')
    expect(badge.dataset.tone).toBe('tertiary')
    expect(badge.style.getPropertyValue('--m3e-badge-size')).toBe('56px')

    const ring = el('[data-part="ring"]')
    expect(ring.style.backgroundColor).toBe('rgb(255, 0, 0)')
    expect(ring.style.clipPath).toBe(shapeClip.pentagon)

    const surface = el('[data-part="surface"]')
    expect(surface.style.clipPath).toBe(shapeClip.pentagon)

    const icon = el('.m3e-icon')
    expect(icon.style.fontSize).toBe('30px')
    expect(icon.hasAttribute('data-fill')).toBe(true)
  })

  it('sets role="img" and aria-label when label is provided, and keeps children visible to AT when omitted', () => {
    render(<ShapeBadge icon="check" label="Готово" />)
    const labeled = el('.m3e-shape-badge')
    expect(labeled.getAttribute('role')).toBe('img')
    expect(labeled.getAttribute('aria-label')).toBe('Готово')
    expect(labeled.hasAttribute('aria-hidden')).toBe(false)

    render(<ShapeBadge icon="star" aria-label="Звезда" />)
    const ariaLabeled = el('.m3e-shape-badge')
    expect(ariaLabeled.getAttribute('role')).toBe('img')
    expect(ariaLabeled.getAttribute('aria-label')).toBe('Звезда')
    expect(ariaLabeled.hasAttribute('aria-hidden')).toBe(false)

    render(<ShapeBadge tone="neutral">{0}</ShapeBadge>)
    const counted = el('.m3e-shape-badge')
    expect(counted.hasAttribute('aria-hidden')).toBe(false)
    expect(counted.hasAttribute('role')).toBe(false)
    expect(counted.textContent).toBe('0')
  })
})
