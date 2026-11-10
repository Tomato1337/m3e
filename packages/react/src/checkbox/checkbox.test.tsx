// @vitest-environment jsdom
import { act, createRef, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox.tsx'
import { Radio } from './Radio.tsx'

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
const inputs = () => [...host.querySelectorAll('input')]

describe('Checkbox', () => {
  it('reports the new value', () => {
    const onChange = vi.fn()
    render(<Checkbox ariaLabel="Выбрать" checked={false} onChange={onChange} />)
    const [input] = inputs()
    expect(input!.type).toBe('checkbox')
    expect(input!.className).toBe('m3e-checkbox')
    expect(input!.getAttribute('aria-label')).toBe('Выбрать')
    act(() => input!.click())
    expect(onChange).toHaveBeenCalledWith(true)

    render(<Checkbox ariaLabel="Выбрать" checked onChange={onChange} />)
    act(() => input!.click())
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('sets indeterminate as a DOM property and restores it after a click', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Checkbox ref={ref} label="Все" checked={false} indeterminate onChange={() => {}} />)
    expect(ref.current!.indeterminate).toBe(true)
    act(() => ref.current!.click())
    expect(ref.current!.indeterminate).toBe(true)
    render(<Checkbox ref={ref} label="Все" checked={false} onChange={() => {}} />)
    expect(ref.current!.indeterminate).toBe(false)
  })

  it('toggles when the label is clicked; the label may hold any content', () => {
    function Demo() {
      const [on, setOn] = useState(false)
      return <Checkbox label={<>Добавить <b>excited</b> в колоду</>} checked={on} onChange={setOn} className="row" name="add" />
    }
    render(<Demo />)
    const label = host.querySelector('label')!
    expect(label.className).toBe('m3e-choice row')
    expect(inputs()[0]!.name).toBe('add')
    expect(inputs()[0]!.hasAttribute('aria-label')).toBe(false)
    act(() => label.querySelector('b')!.click())
    expect(inputs()[0]!.checked).toBe(true)
  })

  it('is disabled with a marked row', () => {
    const onChange = vi.fn()
    render(<Checkbox label="Недоступно" checked={false} disabled onChange={onChange} />)
    expect(inputs()[0]!.disabled).toBe(true)
    expect(host.querySelector('label')!.hasAttribute('data-disabled')).toBe(true)
    act(() => host.querySelector('label')!.click())
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Radio', () => {
  it('groups by name and reports the checked one', () => {
    function Demo() {
      const [v, setV] = useState('a')
      return (
        <>
          <Radio name="speed" value="a" label="Медленно" checked={v === 'a'} onChange={() => setV('a')} />
          <Radio name="speed" value="b" label="Быстро" checked={v === 'b'} onChange={() => setV('b')} />
        </>
      )
    }
    render(<Demo />)
    const [a, b] = inputs()
    expect([a!.type, a!.name, a!.value, b!.value]).toEqual(['radio', 'speed', 'a', 'b'])
    expect(a!.className).toBe('m3e-radio')
    expect([a!.checked, b!.checked]).toEqual([true, false])
    act(() => host.querySelectorAll('label')[1]!.click())
    expect([a!.checked, b!.checked]).toEqual([false, true])
  })
})
