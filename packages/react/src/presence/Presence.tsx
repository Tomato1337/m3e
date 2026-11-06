import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { animateExit, clearExit } from './exit.ts'

type PresenceContextValue = {
  /** False while the subtree plays its exit; it unmounts once every participant is done. */
  present: boolean
  /** Changes with every exit, so a late `done()` from an earlier one is ignored. */
  exitId: number
  /** A component that runs its own exit (Dialog, Menu…) registers while mounted. */
  register: () => () => void
  done: (exitId: number) => void
}

const PresenceContext = createContext<PresenceContextValue | null>(null)

const shown = (node: ReactNode) => node !== null && node !== undefined && node !== false && node !== true && node !== ''

/**
 * Keeps its children mounted until their exit motion has played: wrap a conditional render,
 * `<Presence>{open && <Settings />}</Presence>`, and closing animates instead of cutting.
 *
 * While exiting it renders the last children it was given (so they need not stay valid props-wise).
 * Kit surfaces inside (Dialog, Sheet…) run their own exit and report back; any other content gets
 * `data-closing` on its top elements and is removed when their CSS transitions/animations end
 * (see the `m3e-motion-*` classes). Reopening mid-exit reverses the motion.
 */
export function Presence({ children, onExitComplete }: { children?: ReactNode; onExitComplete?: () => void }) {
  const present = shown(children)
  const [state, setState] = useState({ present, exiting: false, exitId: 0 })
  if (state.present !== present) {
    // A render-phase update from props: React re-renders right away, before committing.
    setState((s) => ({ present, exiting: !present, exitId: present ? s.exitId : s.exitId + 1 }))
  }

  // The children to keep showing while exiting: the last ones given while present.
  const [last, setLast] = useState<ReactNode>(present ? children : null)
  if (present && children !== last) setLast(children)

  const wrap = useRef<HTMLDivElement>(null)
  const participants = useRef(0)
  const doneCount = useRef(new Map<number, number>())
  const live = useRef(state)
  const finish = useRef(onExitComplete)
  // Before any child effect can report back (children's layout effects run first, but done() is async).
  useLayoutEffect(() => {
    live.current = state
    finish.current = onExitComplete
  })

  const complete = useCallback((exitId: number) => {
    setState((s) => (s.exiting && s.exitId === exitId ? { ...s, exiting: false } : s))
    finish.current?.()
  }, [])

  const check = useCallback(() => {
    const s = live.current
    if (!s.exiting || participants.current === 0) return
    if ((doneCount.current.get(s.exitId) ?? 0) >= participants.current) complete(s.exitId)
  }, [complete])

  const register = useCallback(() => {
    participants.current++
    return () => {
      participants.current--
      check()
    }
  }, [check])

  const done = useCallback((exitId: number) => {
    doneCount.current.set(exitId, (doneCount.current.get(exitId) ?? 0) + 1)
    check()
  }, [check])

  useEffect(() => {
    if (!state.exiting) return
    // Participants already reacted (child effects run first); they may even be done.
    if (participants.current > 0) {
      check()
      return
    }
    const ctl = new AbortController()
    const els = wrap.current ? Array.from(wrap.current.children) : []
    void Promise.all(els.map((el) => animateExit(el, ctl.signal))).then(() => {
      if (!ctl.signal.aborted) complete(state.exitId)
    })
    return () => {
      ctl.abort()
      els.forEach(clearExit)
    }
  }, [state.exiting, state.exitId, check, complete])

  useEffect(() => () => { doneCount.current.clear() }, [])

  const value = useMemo<PresenceContextValue>(
    () => ({ present, exitId: state.exitId, register, done }),
    [present, state.exitId, register, done],
  )

  const content = present ? children : state.exiting ? last : null
  if (!shown(content)) return null
  return (
    <PresenceContext.Provider value={value}>
      {/* display: contents — no box, so the children lay out as if this wrapper were not there. */}
      <div ref={wrap} data-m3e-presence="" style={{ display: 'contents' }}>
        {content}
      </div>
    </PresenceContext.Provider>
  )
}

/**
 * For components with their own exit (Dialog, Menu…): whether the nearest `<Presence>` still wants
 * them shown, and the callback to report that their exit finished. Outside a Presence it is always
 * present and `done` is a no-op.
 */
export function usePresenceParticipant(): { present: boolean; done: () => void } {
  const ctx = useContext(PresenceContext)
  const register = ctx?.register
  useLayoutEffect(() => register?.(), [register])
  const exitId = ctx?.exitId ?? 0
  const report = ctx?.done
  const done = useCallback(() => report?.(exitId), [report, exitId])
  return { present: ctx?.present ?? true, done }
}

/**
 * Presence for one element that stays in the tree: `mounted` remains true after `open` turns false
 * until the element behind `ref` has played its exit (`data-closing`). Use it when the closed state
 * also changes the layout around the element, e.g. a side panel's grid column:
 *
 *   const ref = useRef<HTMLElement>(null)
 *   const { mounted } = usePresence(open, ref)
 *   {mounted && <aside ref={ref} className="m3e-motion-from-right">…</aside>}
 */
export function usePresence(open: boolean, ref: RefObject<Element | null>): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)
  useLayoutEffect(() => {
    if (open) clearExit(ref.current)
  }, [open, ref])
  useEffect(() => {
    if (open || !mounted) return
    const el = ref.current
    if (!el) {
      setMounted(false)
      return
    }
    const ctl = new AbortController()
    void animateExit(el, ctl.signal).then(() => {
      if (!ctl.signal.aborted) setMounted(false)
    })
    return () => ctl.abort()
  }, [open, mounted, ref])
  return { mounted, closing: mounted && !open }
}
