import type { CSSProperties, InputHTMLAttributes, Ref } from 'react'
import { cx } from '../cx.ts'

export type SliderSize = 'sm' | 'md'

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max' | 'size' | 'children'> & {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: SliderSize
  /** Accessible name (aria-label). */
  label?: string
  ref?: Ref<HTMLInputElement>
}

/** Filled share of the track: (value − min) / (max − min), clamped to 0…1; 0 when non-finite or max ≤ min. */
export function sliderFill(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/**
 * Native range input: `sm` (4 px track, 4×20 px handle) or `md` (14 px track, 4×36 px handle);
 * the passed part is drawn by a gradient that reads `--m3e-slider-fill`, so keyboard, form value
 * and screen-reader state stay native.
 */
export function Slider({ value, onChange, min = 0, max = 100, size = 'sm', label, className, style, ref, ...rest }: SliderProps) {
  return (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      value={value}
      data-size={size === 'md' ? 'md' : undefined}
      aria-label={label}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      className={cx('m3e-slider', className)}
      style={{ '--m3e-slider-fill': sliderFill(value, min, max), ...style } as CSSProperties}
      {...rest}
    />
  )
}
