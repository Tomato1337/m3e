import type { ButtonHTMLAttributes, CSSProperties, Ref } from 'react'
import { cx } from '../cx.ts'
import { Icon } from '../icon/Icon.tsx'
import { shapeClip, type ShapeName } from '../shape/shapes.ts'
import { useTipAnchor } from '../tooltip/useTipAnchor.ts'
import { linkAttrs, type LinkOnlyProps } from './link.ts'

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'secondary' | 'tertiary' | 'outlined'
export type IconButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero'
export type TipPosition = 'top' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right'

type IconButtonOwnProps = {
  icon: string
  /** Accessible name and tooltip text. */
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** Expressive silhouette (clip-path), e.g. "cookie9". */
  shape?: ShapeName
  /** Corner radius at rest (finite lengths only, so it can morph); defaults per size. */
  radius?: string
  /** Corner radius while pressed: the expressive shape morph. Defaults per size. */
  pressRadius?: string
  fill?: boolean
  /**
   * Toggle state: aria-pressed on a button (leave undefined for a plain action), aria-current="page"
   * on a link.
   */
  selected?: boolean
  tipPos?: TipPosition
  /** No tooltip, e.g. when the label is visible next to the button. */
  noTip?: boolean
}

/** `<button type="button">`. */
export type IconButtonAsButton = IconButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof IconButtonOwnProps | 'children'> & { href?: undefined; ref?: Ref<HTMLButtonElement> }

/** `<a href>` that looks like the icon button. */
export type IconButtonAsLink = IconButtonOwnProps &
  Omit<LinkOnlyProps, keyof IconButtonOwnProps | 'children'> & { ref?: Ref<HTMLAnchorElement> }

export type IconButtonProps = IconButtonAsButton | IconButtonAsLink

const GLYPH: Record<IconButtonSize, number> = { sm: 18, md: 22, lg: 24, xl: 28, hero: 40 }

/**
 * M3 Expressive icon button: 28/40/48/64×56/96×72 boxes, colour variants, optional silhouette and
 * a corner morph on press. With `href` it renders a link with the same parts.
 *
 * The host (<button> or <a>) only carries the tooltip (`data-tip` ::after) and the focus ring and has
 * no transitions itself: the container, the state layer and the morph live on child parts. WebKitGTK
 * restarts an element's running transitions from its ::after's values when that pseudo appears, so a
 * transitioned host flashed to the tooltip's colour and corners on every hover.
 */
export function IconButton({
  icon,
  label,
  variant = 'standard',
  size = 'md',
  shape,
  radius,
  pressRadius,
  fill,
  selected,
  tipPos = 'top',
  noTip,
  className,
  style,
  ...rest
}: IconButtonProps) {
  const tip = useTipAnchor()
  const clip = shape ? ({ clipPath: shapeClip[shape], WebkitClipPath: shapeClip[shape] } as CSSProperties) : undefined
  const host = {
    'aria-label': label,
    'data-tip': noTip ? undefined : label,
    'data-tip-pos': noTip ? undefined : tipPos,
    'data-variant': variant,
    'data-size': size,
    className: cx('m3e-icon-button', className),
    style: {
      ...(radius ? { '--m3e-icon-button-radius': radius } : null),
      ...(pressRadius || radius ? { '--m3e-icon-button-press-radius': pressRadius ?? radius } : null),
      ...tip,
      ...style,
    } as CSSProperties,
  }
  const parts = (
    <>
      <span aria-hidden="true" data-part="surface" style={clip} />
      <span aria-hidden="true" data-part="state" style={clip} />
      <span data-part="icon">
        <Icon name={icon} size={GLYPH[size]} fill={fill} />
      </span>
    </>
  )
  if (rest.href !== undefined) {
    const { href, disabled, onClick, ref, ...link } = rest
    return (
      <a ref={ref} {...linkAttrs(href, disabled, selected, onClick)} {...host} {...link}>
        {parts}
      </a>
    )
  }
  const { ref, ...button } = rest
  return (
    <button type="button" ref={ref} aria-pressed={selected} {...host} {...button}>
      {parts}
    </button>
  )
}
