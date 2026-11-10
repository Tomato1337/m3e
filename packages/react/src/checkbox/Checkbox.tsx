import { useLayoutEffect, useMemo, useRef, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cx } from '../cx.ts'
import { mergeRefs } from '../useLatest.ts'

export type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange' | 'children'> & {
  /** Visible label: any content, may wrap over several lines. */
  label?: ReactNode
  /** Accessible name when the visible text lives outside this component. */
  ariaLabel?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  /** Class of the label row, or of the input without `label`. */
  className?: string
  ref?: Ref<HTMLInputElement>
}

/** A native checkbox or radio, alone or in a label row; shared by Checkbox and Radio. */
export function Choice({ type, label, ariaLabel, onChange, className, ...rest }: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  const input = (
    <input
      {...rest}
      type={type}
      aria-label={label ? undefined : ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
      className={cx(`m3e-${type}`, !label && className)}
    />
  )
  if (!label) return input
  return (
    <label className={cx('m3e-choice', className)} data-disabled={rest.disabled ? '' : undefined}>
      {input}
      <span>{label}</span>
    </label>
  )
}

/**
 * Native checkbox in the primary accent colour (`accent-color`), with an optional label row.
 * `indeterminate` is a DOM property, so it is set from an effect and after each click.
 */
export function Checkbox({ indeterminate, onChange, ref, ...rest }: ChoiceProps & { indeterminate?: boolean }) {
  const el = useRef<HTMLInputElement>(null)
  const setRef = useMemo(() => mergeRefs(el, ref), [ref])
  useLayoutEffect(() => {
    if (el.current) el.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <Choice
      {...rest}
      type="checkbox"
      ref={setRef}
      onChange={(v) => {
        // A click clears the property; put it back unless the caller re-renders with a new value.
        if (el.current) el.current.indeterminate = !!indeterminate
        onChange(v)
      }}
    />
  )
}
