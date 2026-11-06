import { describe, expect, it } from 'vitest'
import { hideToast, toast, toastStore } from './toast.ts'

describe('toast store', () => {
  it('shows, restarts on the same text and hides', () => {
    toast('Saved')
    const first = toastStore.get()
    expect(first.message).toBe('Saved')
    toast('Saved', { durationMs: 8000 })
    const second = toastStore.get()
    expect(second.seq).toBe(first.seq + 1)
    expect(second.options.durationMs).toBe(8000)
    hideToast()
    expect(toastStore.get().message).toBeNull()
  })

  it('notifies subscribers', () => {
    let calls = 0
    const off = toastStore.subscribe(() => calls++)
    toast('One')
    hideToast()
    hideToast() // already hidden: no extra notification
    off()
    toast('Two')
    expect(calls).toBe(2)
  })
})
