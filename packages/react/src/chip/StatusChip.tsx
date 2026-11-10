import type { HTMLAttributes } from 'react'
import { cx } from '../cx.ts'
import { Icon } from '../icon/Icon.tsx'

export type StatusTone = 'neutral' | 'primary' | 'secondary' | 'tertiary' | 'error'
export type StatusChipSize = 'sm' | 'md'

export type StatusChipProps = HTMLAttributes<HTMLSpanElement> & {
  /** Colour pair; an app tone sets --m3e-status-chip-container / -content instead. */
  tone?: StatusTone
  /** sm: label-small, 2×8 px; md: label-medium, 4×12 px. */
  size?: StatusChipSize
  /** Leading 14 px Material Symbols glyph (decorative). */
  icon?: string
}

/** A non-interactive status pill ("не настроено", a task weight): text, not a button or a live region. */
export function StatusChip({ tone = 'neutral', size = 'sm', icon, className, children, ...rest }: StatusChipProps) {
  return (
    <span data-tone={tone} data-size={size} className={cx('m3e-status-chip', className)} {...rest}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}
