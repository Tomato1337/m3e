import { useId, type CSSProperties } from 'react'

/**
 * A unique anchor name for one CSS tooltip (`data-tip`). CSS Anchor Positioning resolves duplicate
 * names to the last element in the document, so every host gets its own via `--tip-anchor`.
 */
export function useTipAnchor(): CSSProperties {
  const id = useId().replace(/[^A-Za-z0-9_-]/g, '_')
  return { '--tip-anchor': `--tip-${id}` } as CSSProperties
}
