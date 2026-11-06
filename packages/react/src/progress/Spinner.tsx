import type { CSSProperties } from 'react'
import { cx } from '../cx.ts'

/**
 * Indeterminate busy ring. With `label` it is a native <progress> (an implicit progressbar with
 * that name) — the right element for a loading state, not a live region. Without one it is a
 * decorative span: use that inside a control that already says what is happening.
 */
export function Spinner({ label, size, width, className, style }: {
  label?: string
  /** Outer size in px (default 48). */
  size?: number
  /** Ring thickness in px (default 4). */
  width?: number
  className?: string
  style?: CSSProperties
}) {
  const vars = {
    ...(size ? { '--m3e-spinner-size': `${size}px` } : null),
    ...(width ? { '--m3e-spinner-width': `${width}px` } : null),
    ...style,
  } as CSSProperties
  if (label) return <progress aria-label={label} className={cx('m3e-spinner', className)} style={vars} />
  return <span aria-hidden="true" className={cx('m3e-spinner', className)} style={vars} />
}
