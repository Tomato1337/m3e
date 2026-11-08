import { hideToast, toast, toastStore, updateToast, type ToastAction } from '@tomato1337/m3e-react'

const GRACE_MS = 5000
const WORD = '«excited»'

/** Stand-in for a backend acknowledgement. */
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

type Hooks = {
  /** Hover or focus holds the countdown. */
  onHeld: (held: boolean) => void
  onEdit: () => void
}

/**
 * A simulated quick-add task on one persistent snackbar: a 5 s window to cancel (held while the
 * pointer or focus is on it), then progress, then the result — all as same-id updates.
 */
export function startTask({ onHeld, onEdit }: Hooks): void {
  let left = GRACE_MS
  let since = performance.now()
  let held = false
  const remaining = () => (held ? left : Math.max(0, left - (performance.now() - since)))
  const countdown = () => `${WORD} — добавление через ${Math.ceil(remaining() / 1000)} с`

  const cancel: ToastAction = {
    label: 'Отменить',
    dismiss: false,
    async run() {
      await wait(700)
      clearInterval(ticker)
      updateToast(id, {
        message: `${WORD}: добавление отменено`,
        options: { durationMs: 4000, icon: 'undo', progress: undefined, actions: undefined },
      })
    },
  }
  const edit: ToastAction = {
    label: 'Редактировать',
    variant: 'tonal',
    dismiss: false,
    async run() {
      await wait(400)
      clearInterval(ticker)
      hideToast(id)
      onEdit()
    },
  }
  const remove: ToastAction = {
    label: 'Удалить из Anki',
    dismiss: false,
    async run() {
      await wait(700)
      updateToast(id, { message: `${WORD} удалена из Anki`, options: { durationMs: 4000, icon: 'delete', actions: undefined } })
    },
  }

  const id = toast(countdown(), {
    durationMs: null,
    icon: 'add_card',
    progress: { value: 1, label: 'Время на отмену', clock: () => remaining() / GRACE_MS },
    actions: [cancel, edit],
    onInteractionChange(paused) {
      if (paused) {
        left = remaining()
        held = true
      } else {
        held = false
        since = performance.now()
      }
      onHeld(paused)
    },
  })

  let work = 0
  const ticker = setInterval(() => {
    const now = toastStore.get()
    if (now.message === null || now.seq !== id) {
      clearInterval(ticker)
      return
    }
    if (remaining() > 0) {
      if (now.message !== countdown()) updateToast(id, { message: countdown() })
      return
    }
    work += 0.08
    if (work < 1) {
      const attempt = work < 0.5 ? 1 : 2
      updateToast(id, {
        message: `${WORD} — генерация картинки (Runware, попытка ${attempt})`,
        options: { icon: 'image', progress: { value: work, label: 'Генерация картинки' }, actions: [cancel] },
      })
      return
    }
    clearInterval(ticker)
    updateToast(id, {
      message: `${WORD} добавлена в Anki: «взволнованный», колода English`,
      options: { durationMs: 10_000, icon: 'check', progress: undefined, actions: [{ ...edit, run: onEdit, dismiss: true }, remove] },
    })
  }, 250)
}
