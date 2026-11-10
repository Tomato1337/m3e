import type { CSSProperties, InputHTMLAttributes, Ref } from 'react'
import { cx } from '../cx.ts'

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max' | 'children'> & {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Accessible name (aria-label). */
  label?: string
  ref?: Ref<HTMLInputElement>
}

/** Filled share of the track: (value − min) / (max − min), clamped to 0…1; 0 when max ≤ min. */
export function sliderFill(value: number, min: number, max: number): number {
  if (!(max > min)) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/**
 * Native range input: 4 px track, 4×20 px handle; the passed part is drawn by a gradient that
 * reads `--m3e-slider-fill`, so keyboard, form value and screen-reader state stay native.
 */
export function Slider({ value, onChange, min = 0, max = 100, label, className, style, ref, ...rest }: SliderProps) {
  return (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      className={cx('m3e-slider', className)}
      style={{ '--m3e-slider-fill': sliderFill(value, min, max), ...style } as CSSProperties}
      {...rest}
    />
  )
}
