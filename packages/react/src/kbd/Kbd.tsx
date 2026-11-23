import type { HTMLAttributes, Ref } from 'react'
import { cx } from '../cx.ts'

export type KbdSize = 'sm' | 'md'

export type KbdProps = HTMLAttributes<HTMLElement> & {
  /** Keycap size: `sm` (label-medium) or `md` (label-large). */
  size?: KbdSize
  ref?: Ref<HTMLElement>
}

/** Keyboard shortcut keycap (`<kbd>`). */
export function Kbd({ size = 'sm', className, children, ref, ...rest }: KbdProps) {
  return (
    <kbd ref={ref} data-size={size} className={cx('m3e-kbd', className)} {...rest}>
      {children}
    </kbd>
  )
}
