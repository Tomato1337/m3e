// @vitest-environment jsdom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { announce } from '../a11y/announce.ts'
import { animateExit, CLOSING } from './exit.ts'
import { Presence, usePresence } from './Presence.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/** A fake running transition whose end the test controls. */
function fakeAnimation() {
  let finish!: () => void
  const finished = new Promise<void>((r) => { finish = r })
  const anim = { finished, effect: { getComputedTiming: () => ({ endTime: 200 }) } } as unknown as Animation
  return { anim, finish }
}

let host: HTMLDivElement
let root: Root
let running: Animation[] = []

beforeEach(() => {
  running = []
  Element.prototype.getAnimations = function () { return this.hasAttribute(CLOSING) ? running : [] }
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

function Demo({ open, onDone }: { open: boolean; onDone?: () => void }) {
  return <Presence onExitComplete={onDone}>{open && <p className="m3e-motion-fade">hello</p>}</Presence>
}

describe('Presence', () => {
  it('keeps the child until its exit motion has finished', async () => {
    const { anim, finish } = fakeAnimation()
    running = [anim]
    const onDone = vi.fn()
    act(() => root.render(<Demo open onDone={onDone} />))
    expect(host.querySelector('p')).not.toBeNull()

    act(() => root.render(<Demo open={false} onDone={onDone} />))
    const p = host.querySelector('p')
    expect(p?.hasAttribute(CLOSING)).toBe(true)
    await flush()
    expect(host.querySelector('p')).not.toBeNull()

    finish()
    await flush()
    expect(host.querySelector('p')).toBeNull()
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('reverses when reopened mid-exit', async () => {
    const { anim } = fakeAnimation()
    running = [anim]
    act(() => root.render(<Demo open />))
    act(() => root.render(<Demo open={false} />))
    expect(host.querySelector('p')?.hasAttribute(CLOSING)).toBe(true)
    act(() => root.render(<Demo open />))
    await flush()
    const p = host.querySelector('p')
    expect(p).not.toBeNull()
    expect(p?.hasAttribute(CLOSING)).toBe(false)
  })

  it('unmounts at once when nothing animates', async () => {
    act(() => root.render(<Demo open />))
    act(() => root.render(<Demo open={false} />))
    await flush()
    expect(host.querySelector('p')).toBeNull()
  })

  it('gives up after the safety timeout', async () => {
    vi.useFakeTimers()
    const { anim } = fakeAnimation()
    running = [anim]
    const el = document.createElement('div')
    let settled = false
    void animateExit(el).then(() => { settled = true })
    await vi.advanceTimersByTimeAsync(1999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(2)
    expect(settled).toBe(true)
  })
})

describe('usePresence', () => {
  function Panel({ open }: { open: boolean }) {
    const ref = useRef<HTMLElement>(null)
    const { mounted, closing } = usePresence(open, ref)
    return mounted ? <aside ref={ref} data-state={closing ? 'closing' : 'open'} /> : null
  }

  it('stays mounted while closing, then unmounts', async () => {
    const { anim, finish } = fakeAnimation()
    running = [anim]
    act(() => root.render(<Panel open />))
    act(() => root.render(<Panel open={false} />))
    expect(host.querySelector('aside')?.dataset.state).toBe('closing')
    finish()
    await flush()
    expect(host.querySelector('aside')).toBeNull()
  })
})

describe('announce', () => {
  it('writes into one polite region after a beat', async () => {
    vi.useFakeTimers()
    announce('Saved')
    const region = document.body.querySelector<HTMLElement>(':scope > [data-m3e-announcer]')
    expect(region?.getAttribute('aria-live')).toBe('polite')
    expect(region?.textContent).toBe('')
    await vi.advanceTimersByTimeAsync(200)
    expect(region?.textContent).toBe('Saved')
    announce('Again')
    expect(document.body.querySelectorAll('[data-m3e-announcer]')).toHaveLength(1)
  })

  it('follows an open modal dialog, outside of which everything is inert', async () => {
    vi.useFakeTimers()
    const d = document.createElement('dialog')
    d.setAttribute('open', '')
    document.body.append(d)
    const matches = Element.prototype.matches
    const fake = function (this: Element, sel: string) {
      return sel === ':modal' ? this === d : matches.call(this, sel)
    }
    Element.prototype.matches = fake as typeof matches
    try {
      announce('Inside')
      await vi.advanceTimersByTimeAsync(200)
      expect(d.querySelector('[data-m3e-announcer]')?.textContent).toBe('Inside')
    } finally {
      Element.prototype.matches = matches
      d.remove()
    }
  })
})

