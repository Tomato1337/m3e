import { useSyncExternalStore } from 'react'

export type ToastOptions = {
  /** Default 4 s; give actions more time (M3: about 10 s). */
  durationMs?: number
  action?: { label: string; run: () => void }
  /** Bottom-center snackbar by default; `top` for short status confirmations. */
  placement?: 'bottom' | 'top'
}

export type ToastState = {
  message: string | null
  options: ToastOptions
  /** Bumps with every toast, so the same text shown twice still restarts the timer. */
  seq: number
}

let state: ToastState = { message: null, options: {}, seq: 0 }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Framework-free store behind `toast()`; one snackbar per app. */
export const toastStore = {
  get: (): ToastState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  show(message: string, options: ToastOptions = {}): void {
    state = { message, options, seq: state.seq + 1 }
    emit()
  },
  hide(): void {
    if (state.message === null) return
    state = { ...state, message: null }
    emit()
  },
}

/** Shows a snackbar message (replacing the current one). */
export const toast = (message: string, options?: ToastOptions): void => toastStore.show(message, options)
export const hideToast = (): void => toastStore.hide()

export function useToast(): ToastState {
  return useSyncExternalStore(toastStore.subscribe, toastStore.get, toastStore.get)
}
