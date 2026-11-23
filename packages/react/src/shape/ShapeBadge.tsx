import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../cx.ts'
import { Icon } from '../icon/Icon.tsx'
import { shapeClip, type ShapeName } from './shapes.ts'

export type ShapeBadgeTone = 'primary' | 'secondary' | 'tertiary' | 'error' | 'neutral'

export type ShapeBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  /** Expressive silhouette or `'circle'` (default). */
  shape?: ShapeName | 'circle'
  /** Badge diameter in px (default `40`). */
  size?: number
  /** Colour pair; custom tones override `--m3e-badge-container` and `--m3e-badge-content`. */
  tone?: ShapeBadgeTone
  /** Material Symbols glyph name rendered inside the badge. */
  icon?: string
  /** Fill variation for the icon glyph. */
  iconFill?: boolean
  /** Icon size in px (default `Math.round(size * 0.5)`). */
  iconSize?: number
  /** Outer ring colour, rendered at `size + 6` px behind the badge so `clip-path` never clips it. */
  ringColor?: string
  /** Accessible name (`role="img"` + `aria-label`); omit for decorative badges unless `children` carry meaning. */
  label?: string
  children?: ReactNode
  ref?: Ref<HTMLSpanElement>
}

/** Expressive shape badge: circle or clipped polygon silhouette with optional icon, content and outer ring. */
export function ShapeBadge({
  shape = 'circle',
  size = 40,
  tone = 'primary',
  icon,
  iconFill,
  iconSize = Math.round(size * 0.5),
  ringColor,
  label,
  className,
  style,
  children,
  ref,
  ...rest
}: ShapeBadgeProps) {
  const clip: CSSProperties | undefined =
    shape === 'circle' ? undefined : { clipPath: shapeClip[shape], WebkitClipPath: shapeClip[shape] }
  const hasChildren = children !== undefined && children !== null && typeof children !== 'boolean' && children !== ''
  const a11y: HTMLAttributes<HTMLSpanElement> = label
    ? { role: 'img', 'aria-label': label }
    : rest['aria-label'] || rest['aria-labelledby']
      ? (hasChildren ? {} : { role: 'img' })
      : hasChildren
        ? {}
        : { 'aria-hidden': true }

  return (
    <span
      ref={ref}
      data-shape={shape}
      data-tone={tone}
      className={cx('m3e-shape-badge', className)}
      style={{ '--m3e-badge-size': `${size}px`, ...style } as CSSProperties}
      {...a11y}
      {...rest}
    >
      {ringColor && (
        <span aria-hidden="true" data-part="ring" style={{ backgroundColor: ringColor, ...clip }} />
      )}
      <span aria-hidden="true" data-part="surface" style={clip} />
      {icon && <Icon name={icon} size={iconSize} fill={iconFill} />}
      {children}
    </span>
  )
}
