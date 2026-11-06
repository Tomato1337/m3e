import type { ButtonHTMLAttributes, Ref } from 'react'
import { cx } from '../cx'
import { Icon } from '../icon/Icon'

/**
 * M3 filter chip: 32 px, 8 px corners; selected shows a check mark on secondary-container. The mark
 * is always rendered so it can grow in and out (see chip.css).
 */
export function Chip({ label, selected, className, ref, ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string
  selected: boolean
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button type="button" ref={ref} aria-pressed={selected} className={cx('m3e-chip', className)} {...rest}>
      <span data-part="check" aria-hidden="true">
        <Icon name="check" size={18} />
      </span>
      <span data-part="label">{label}</span>
    </button>
  )
}
