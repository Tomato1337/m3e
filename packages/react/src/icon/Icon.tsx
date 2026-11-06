import { cx } from '../cx.ts'

/** Material Symbols Rounded glyph by ligature name; decorative (the control carries the label). */
export function Icon({ name, size, fill, className }: { name: string; size?: number; fill?: boolean; className?: string }) {
  return (
    <span
      className={cx('m3e-icon', className)}
      data-fill={fill ? '' : undefined}
      style={size ? { fontSize: size } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
