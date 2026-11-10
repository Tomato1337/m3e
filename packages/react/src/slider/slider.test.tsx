// @vitest-environment jsdom
import { act, createRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Slider, sliderFill } from './Slider.tsx'

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
const input = () => host.querySelector('input')!
const fill = () => input().style.getPropertyValue('--m3e-slider-fill')

describe('sliderFill', () => {
  it('is 0 and 1 at the bounds and clamps outside them', () => {
    expect(sliderFill(0, 0, 100)).toBe(0)
    expect(sliderFill(100, 0, 100)).toBe(1)
    expect(sliderFill(-5, 0, 100)).toBe(0)
    expect(sliderFill(120, 0, 100)).toBe(1)
  })

  it('works with a min other than zero', () => {
    expect(sliderFill(15, 10, 30)).toBe(0.25)
    expect(sliderFill(-0.5, -1, 1)).toBe(0.25)
  })

  it('is 0 when max ≤ min', () => {
    expect(sliderFill(5, 10, 10)).toBe(0)
    expect(sliderFill(5, 10, 0)).toBe(0)
  })
})

describe('Slider', () => {
  it('writes the fill share and the native range attributes', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Slider ref={ref} value={0.35} min={0} max={1} step={0.01} label="Громкость" onChange={() => {}} className="dock" />)
    expect(ref.current).toBe(input())
    expect(input().type).toBe('range')
    expect(input().className).toBe('m3e-slider dock')
    expect([input().min, input().max, input().step, input().value]).toEqual(['0', '1', '0.01', '0.35'])
    expect(input().getAttribute('aria-label')).toBe('Громкость')
    expect(fill()).toBe('0.35')

    render(<Slider value={50} label="Громкость" onChange={() => {}} />)
    expect([input().min, input().max]).toEqual(['0', '100'])
    expect(fill()).toBe('0.5')
  })

  it('reports a number', () => {
    const onChange = vi.fn()
    render(<Slider value={20} label="Громкость" onChange={onChange} />)
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setValue.call(input(), '42')
      input().dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledWith(42)
  })

  it('can be disabled', () => {
    render(<Slider value={20} label="Громкость" disabled onChange={() => {}} />)
    expect(input().disabled).toBe(true)
  })
})
