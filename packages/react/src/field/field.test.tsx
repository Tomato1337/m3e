// @vitest-environment jsdom
import { act, createRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Field } from './Field.tsx'
import { Select } from './Select.tsx'
import { TextField } from './TextField.tsx'

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
const described = (control: HTMLElement) =>
  (control.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean).map((id) => document.getElementById(id)?.textContent)

describe('TextField', () => {
  it('labels the input', () => {
    render(<TextField label="Ключ API" />)
    const input = el<HTMLInputElement>('input')
    expect(input.className).toBe('m3e-input')
    expect(input.id).not.toBe('')
    expect(el<HTMLLabelElement>('label').htmlFor).toBe(input.id)
    expect(input.labels?.[0]?.textContent).toBe('Ключ API')
    expect(el('.m3e-field').tagName).toBe('DIV')
  })

  it('describes the input with the hint, and the error replaces it with aria-invalid', () => {
    render(<TextField label="Модель" hint="Например, gpt-4o" aria-describedby="extra" />)
    const input = el('input')
    expect(described(input)).toEqual([undefined, 'Например, gpt-4o'])
    expect(input.hasAttribute('aria-invalid')).toBe(false)

    render(<TextField label="Модель" hint="Например, gpt-4o" error="Нет такой модели" aria-describedby="extra" />)
    expect(described(input)).toEqual([undefined, 'Нет такой модели'])
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(host.querySelector('[data-part="hint"]')).toBeNull()
    expect(el('[data-part="error"]').textContent).toBe('Нет такой модели')
  })

  it('renders a textarea with multiline', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<TextField multiline label="Промпт" rows={4} ref={ref} />)
    expect(ref.current).toBe(el('textarea'))
    expect(ref.current!.rows).toBe(4)
    expect(ref.current!.labels?.[0]?.textContent).toBe('Промпт')
    expect(host.querySelector('input')).toBeNull()
  })

  it('passes ref and native attributes, including onChange with the native event, to the input', () => {
    const ref = createRef<HTMLInputElement>()
    const onChange = vi.fn()
    render(
      <TextField
        ref={ref}
        id="key"
        className="root"
        variant="outlined"
        type="password"
        name="key"
        placeholder="sk-…"
        autoComplete="off"
        style={{ color: 'red' }}
        value=""
        onChange={onChange}
        trailing={<button type="button">Показать</button>}
      />,
    )
    const input = ref.current!
    expect(input).toBe(el('input'))
    expect(input.id).toBe('key')
    expect(input.type).toBe('password')
    expect(input.name).toBe('key')
    expect(input.placeholder).toBe('sk-…')
    expect(input.autocomplete).toBe('off')
    expect(input.style.color).toBe('red')
    expect(input.dataset.variant).toBe('outlined')
    expect(input.hasAttribute('data-trailing')).toBe(true)
    expect(el('.m3e-field').className).toBe('m3e-field root')
    expect(el('[data-part="trailing"]').textContent).toBe('Показать')

    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setValue.call(input, 'abc')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0]![0].target).toBe(input)
  })

  it('takes its name from aria-label without a label', () => {
    render(<TextField aria-label="Поиск" type="search" />)
    expect(host.querySelector('label')).toBeNull()
    expect(el('input').getAttribute('aria-label')).toBe('Поиск')
    expect(el('input').dataset.variant).toBeUndefined()
  })
})

describe('Select', () => {
  it('renders a labelled native select with optgroups and size', () => {
    const ref = createRef<HTMLSelectElement>()
    render(
      <Select ref={ref} label="Модель" hint="Список с прокруткой" size={6} defaultValue="b">
        <optgroup label="OpenAI">
          <option value="a">A</option>
          <option value="b">B</option>
        </optgroup>
        <optgroup label="Anthropic">
          <option value="c">C</option>
        </optgroup>
      </Select>,
    )
    const select = ref.current!
    expect(select).toBe(el('select'))
    expect(select.className).toBe('m3e-input')
    expect(select.size).toBe(6)
    expect(select.value).toBe('b')
    expect(select.querySelectorAll('optgroup')).toHaveLength(2)
    expect(select.labels?.[0]?.textContent).toBe('Модель')
    expect(described(select)).toEqual(['Список с прокруткой'])
  })

  it('passes multiple and marks an error', () => {
    render(
      <Select label="Языки" multiple error="Выберите язык" defaultValue={[]}>
        <option value="en">EN</option>
      </Select>,
    )
    expect(el<HTMLSelectElement>('select').multiple).toBe(true)
    expect(el('select').getAttribute('aria-invalid')).toBe('true')
  })
})

describe('Field', () => {
  it('with htmlFor: a div root and a label for the control, with hint ids', () => {
    render(
      <Field label="Ключ" hint="Хранится локально" htmlFor="api-key" data-testid="f">
        <input id="api-key" className="m3e-input" aria-describedby="api-key-hint" />
      </Field>,
    )
    const root = el('[data-testid="f"]')
    expect(root.tagName).toBe('DIV')
    expect(root.className).toBe('m3e-field')
    expect(el<HTMLLabelElement>('label').htmlFor).toBe('api-key')
    expect(el('[data-part="hint"]').id).toBe('api-key-hint')
    expect(described(el('input'))).toEqual(['Хранится локально'])
  })

  it('without htmlFor: a label root wrapping the control', () => {
    render(
      <Field label="Ключ" error="Пусто">
        <input className="m3e-input" />
      </Field>,
    )
    const root = el('.m3e-field')
    expect(root.tagName).toBe('LABEL')
    expect(el<HTMLInputElement>('input').labels?.[0]).toBe(root)
    expect(el('[data-part="label"]').tagName).toBe('SPAN')
    expect(el('[data-part="error"]').textContent).toBe('Пусто')
    expect(el('[data-part="error"]').hasAttribute('id')).toBe(false)
  })
})
