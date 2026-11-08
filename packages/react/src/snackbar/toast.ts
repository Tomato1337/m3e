import { useSyncExternalStore } from 'react'

export type ToastAction = {
  label: string
  run: () => void | Promise<void>
  /** Text button by default; `tonal` for the main action next to a text one. */
  variant?: 'tonal' | 'text'
  /**
   * `false`: the snackbar stays up and its buttons are locked until `run` settles, so the caller
   * can await its own work and then update or hide the message itself. By default the snackbar
   * hides first and runs the action afterwards.
   */
  dismiss?: boolean
}

export type ToastProgress = {
  /** 0–1. */
  value: number
  /** Accessible name of the progress bar. */
  label: string
  /** Read every animation frame instead of `value` (drawn through refs, no React render). */
  clock?: () => number
}

export type ToastOptions = {
  /** Default 4 s; give actions more time (M3: about 10 s). `null` keeps the message until it is hidden. */
  durationMs?: number | null
  actions?: readonly [ToastAction] | readonly [ToastAction, ToastAction]
  /** Material Symbols glyph in a tonal tile before the message. */
  icon?: string
  progress?: ToastProgress
  /**
   * Called with `true` when hover or focus inside the snackbar pauses its dismissal, and with
   * `false` when both have left, the message is hidden or replaced, or the host unmounts.
   */
  onInteractionChange?: (paused: boolean) => void
  /** Overrides the host's placement for this message. */
  placement?: 'bottom' | 'top'
}

export type ToastState = {
  message: string | null
  options: ToastOptions
  /** Identity of the message: bumps with every `toast()`, never with `updateToast()`. */
  seq: number
}

export type ToastPatch = { message?: string; options?: Partial<ToastOptions> }

let state: ToastState = { message: null, options: {}, seq: 0 }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Framework-free store behind `toast()`; one snackbar per app, a new message replaces the current one. */
export const toastStore = {
  get: (): ToastState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  show(message: string, options: ToastOptions = {}): number {
    state = { message, options, seq: state.seq + 1 }
    emit()
    return state.seq
  },
  update(id: number, patch: ToastPatch): void {
    if (state.message === null || state.seq !== id) return
    state = {
      message: patch.message ?? state.message,
      options: patch.options ? { ...state.options, ...patch.options } : state.options,
      seq: id,
    }
    emit()
  },
  hide(id?: number): void {
    if (state.message === null || (id !== undefined && id !== state.seq)) return
    state = { ...state, message: null }
    emit()
  },
}

/** Shows a snackbar message (replacing the current one); returns its id for `updateToast`/`hideToast`. */
export const toast = (message: string, options?: ToastOptions): number => toastStore.show(message, options)

/**
 * Changes the message with this id while it is still the current one: no new entry motion, no
 * announcement (call `announce()` for a change worth hearing), and the dismissal timer keeps its
 * remaining time unless the patch changes `durationMs`.
 */
export const updateToast = (id: number, patch: ToastPatch): void => toastStore.update(id, patch)

/** Hides the current message; with an id, only while that message is still the current one. */
export const hideToast = (id?: number): void => toastStore.hide(id)

export function useToast(): ToastState {
  return useSyncExternalStore(toastStore.subscribe, toastStore.get, toastStore.get)
}
