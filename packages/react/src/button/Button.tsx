import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../cx.ts'
import { Icon } from '../icon/Icon.tsx'
import { linkAttrs, type LinkOnlyProps } from './link.ts'

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated'
export type ButtonSize = 'xs' | 'sm' | 'md'

type ButtonOwnProps = {
  variant?: ButtonVariant
  /** 32 / 40 / 56 px tall. */
  size?: ButtonSize
  /** Leading Material Symbols glyph. */
  icon?: string
  /**
   * Toggle state: aria-pressed on a button, aria-current="page" on a link; drawn as the selected
   * shape/colour either way.
   */
  selected?: boolean
  children?: ReactNode
}

/** `<button type="button">`. */
export type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & { href?: undefined; ref?: Ref<HTMLButtonElement> }

/** `<a href>` that looks like the button. */
export type ButtonAsLink = ButtonOwnProps & Omit<LinkOnlyProps, keyof ButtonOwnProps> & { ref?: Ref<HTMLAnchorElement> }

export type ButtonProps = ButtonAsButton | ButtonAsLink

/**
 * M3 Expressive common button: pill at rest, corners tighten while pressed (shape morph), and a
 * toggle (`selected`) takes the squarer selected shape. No tooltip host, so the button itself
 * carries the transitions. With `href` it renders a link with the same look.
 */
export function Button({ variant = 'filled', size = 'sm', icon, selected, className, children, ...rest }: ButtonProps) {
  const content = (
    <>
      {icon && <Icon name={icon} size={size === 'md' ? 24 : 20} />}
      {children}
    </>
  )
  if (rest.href !== undefined) {
    const { href, disabled, onClick, ref, ...link } = rest
    return (
      <a
        ref={ref}
        {...linkAttrs(href, disabled, selected, onClick)}
        data-variant={variant}
        data-size={size}
        className={cx('m3e-button', className)}
        {...link}
      >
        {content}
      </a>
    )
  }
  const { ref, ...button } = rest
  return (
    <button
      type="button"
      ref={ref}
      aria-pressed={selected}
      data-variant={variant}
      data-size={size}
      className={cx('m3e-button', className)}
      {...button}
    >
      {content}
    </button>
  )
}
