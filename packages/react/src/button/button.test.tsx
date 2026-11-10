// @vitest-environment jsdom
import { act, createRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button.tsx'
import { Segmented, ToggleButton } from './ButtonGroup.tsx'
import { IconButton } from './IconButton.tsx'

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
const el = (selector: string) => host.querySelector<HTMLElement>(selector)!

describe('Button', () => {
  it('renders a link with the button class and attributes when given href', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(
      <Button ref={ref} href="/lessons" target="_blank" rel="noopener" download="x.txt" variant="tonal" size="xs" icon="school" className="extra">
        Уроки
      </Button>,
    )
    const a = el('a')
    expect(ref.current).toBe(a)
    expect(host.querySelector('button')).toBeNull()
    expect(a.className).toBe('m3e-button extra')
    expect(a.getAttribute('href')).toBe('/lessons')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener')
    expect(a.getAttribute('download')).toBe('x.txt')
    expect(a.dataset.variant).toBe('tonal')
    expect(a.dataset.size).toBe('xs')
    expect(a.hasAttribute('type')).toBe(false)
    expect(a.querySelector('.m3e-icon')?.textContent).toBe('school')
    expect(a.textContent).toBe('schoolУроки')
  })

  it('stays a type="button" button without href', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Сохранить</Button>)
    expect(ref.current).toBe(el('button'))
    expect(el('button').getAttribute('type')).toBe('button')
    expect(el('button').className).toBe('m3e-button')
  })

  it('marks selection as aria-current on a link and aria-pressed on a button', () => {
    render(
      <>
        <Button href="#a" selected>Ссылка</Button>
        <Button href="#b" selected={false}>Другая</Button>
        <Button selected>Кнопка</Button>
      </>,
    )
    const [current, other] = host.querySelectorAll('a')
    expect(current!.getAttribute('aria-current')).toBe('page')
    expect(current!.hasAttribute('aria-pressed')).toBe(false)
    expect(other!.hasAttribute('aria-current')).toBe(false)
    expect(el('button').getAttribute('aria-pressed')).toBe('true')
    expect(el('button').hasAttribute('aria-current')).toBe(false)
  })

  it('drops href and clicks from a disabled link', () => {
    const onClick = vi.fn()
    render(<Button href="/settings" disabled onClick={onClick}>Настройки</Button>)
    const a = el('a')
    expect(a.hasAttribute('href')).toBe(false)
    expect(a.hasAttribute('disabled')).toBe(false)
    expect(a.getAttribute('role')).toBe('link')
    expect(a.getAttribute('aria-disabled')).toBe('true')
    expect(a.hasAttribute('data-disabled')).toBe(true)
    act(() => a.click())
    expect(onClick).not.toHaveBeenCalled()
  })

  it('passes clicks through on an enabled link', () => {
    const onClick = vi.fn((e: { preventDefault(): void }) => e.preventDefault())
    render(<Button href="#x" onClick={onClick}>Ссылка</Button>)
    act(() => el('a').click())
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('IconButton', () => {
  it('keeps the label, tooltip and three parts as a link', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(<IconButton ref={ref} href="/book" icon="menu_book" label="Книга" variant="tonal" tipPos="bottom" selected />)
    const a = el('a')
    expect(ref.current).toBe(a)
    expect(a.className).toBe('m3e-icon-button')
    expect(a.getAttribute('href')).toBe('/book')
    expect(a.getAttribute('aria-label')).toBe('Книга')
    expect(a.dataset.tip).toBe('Книга')
    expect(a.dataset.tipPos).toBe('bottom')
    expect(a.getAttribute('aria-current')).toBe('page')
    expect(a.style.getPropertyValue('--tip-anchor')).toMatch(/^--tip-/)
    expect([...a.children].map((c) => c.getAttribute('data-part'))).toEqual(['surface', 'state', 'icon'])
  })

  it('disables a link the same way as Button', () => {
    render(<IconButton href="/book" icon="menu_book" label="Книга" disabled />)
    const a = el('a')
    expect(a.hasAttribute('href')).toBe(false)
    expect(a.getAttribute('aria-disabled')).toBe('true')
    expect(a.hasAttribute('data-disabled')).toBe(true)
    expect(a.getAttribute('aria-label')).toBe('Книга')
  })

  it('is still a toggle button without href', () => {
    render(<IconButton icon="mic" label="Микрофон" selected={false} />)
    expect(el('button').getAttribute('type')).toBe('button')
    expect(el('button').getAttribute('aria-pressed')).toBe('false')
    expect(el('button').dataset.tip).toBe('Микрофон')
  })
})

describe('ToggleButton', () => {
  it('can be a navigation link that marks the current page', () => {
    render(<ToggleButton href="#lessons" selected>Уроки</ToggleButton>)
    const a = el('a')
    expect(a.getAttribute('aria-current')).toBe('page')
    expect(a.dataset.variant).toBe('tonal')
    expect(a.hasAttribute('data-toggle')).toBe(true)
  })
})

describe('Segmented', () => {
  it('renders the same markup as before links existed', () => {
    render(
      <Segmented
        label="Схема движения"
        value="b"
        options={[{ value: 'a', label: 'A', icon: 'bolt' }, { value: 'b', label: 'B' }]}
        onChange={() => {}}
      />,
    )
    expect(host.innerHTML).toMatchInlineSnapshot(`"<div role="group" aria-label="Схема движения" data-connected="" class="m3e-button-group"><button type="button" aria-pressed="false" data-variant="tonal" data-size="sm" class="m3e-button" data-toggle=""><span class="m3e-icon" style="font-size: 20px;" aria-hidden="true">bolt</span>A</button><button type="button" aria-pressed="true" data-variant="tonal" data-size="sm" class="m3e-button" data-toggle="">B</button></div>"`)
  })
})
