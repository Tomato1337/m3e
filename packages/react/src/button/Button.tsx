import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../cx'
import { Icon } from '../icon/Icon'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated'
export type ButtonSize = 'xs' | 'sm' | 'md'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  /** 32 / 40 / 56 px tall. */
  size?: ButtonSize
  /** Leading Material Symbols glyph. */
  icon?: string
  /** Toggle state; exposed as aria-pressed and drawn as the selected shape/colour. */
  selected?: boolean
  children?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

/**
 * M3 Expressive common button: pill at rest, corners tighten while pressed (shape morph), and a
 * toggle (`selected`) takes the squarer selected shape. No tooltip host, so the button itself
 * carries the transitions.
 */
export function Button({ variant = 'filled', size = 'sm', icon, selected, className, children, ref, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      ref={ref}
      aria-pressed={selected}
      data-variant={variant}
      data-size={size}
      className={cx('m3e-button', className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'md' ? 24 : 20} />}
      {children}
    </button>
  )
}
