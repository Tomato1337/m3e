import { useLayoutEffect, useRef, type Ref, type RefCallback } from 'react'

/** A ref that always holds the latest value, for event handlers registered once. */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

/** One ref callback feeding several refs (the component's own and the caller's). */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((r) => {
      if (typeof r === 'function') return r(node)
      if (r) r.current = node
      return undefined
    })
    return () => {
      refs.forEach((r, i) => {
        const c = cleanups[i]
        if (typeof c === 'function') c()
        else if (typeof r === 'function') r(null)
        else if (r) r.current = null
      })
    }
  }
}
