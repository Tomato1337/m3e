import type { Ref } from 'react'
import { cx } from '../cx'

/**
 * M3 switch on a native checkbox with the `switch` attribute (and role="switch" for engines that do
 * not know it yet): label association, keyboard, form value and screen-reader state all stay native.
 * The track is the input itself (`appearance: none`), the handle its ::before.
 */
export function Switch({ label, ariaLabel, checked, disabled, onChange, className, ref }: {
  label?: string
  /** Accessible name when the visible text lives outside this component. */
  ariaLabel?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  className?: string
  ref?: Ref<HTMLInputElement>
}) {
  const input = (
    <input
      ref={ref}
      type="checkbox"
      {...{ switch: '' }}
      role="switch"
      aria-label={label ? undefined : ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="m3e-switch"
    />
  )
  if (!label) return input
  return (
    <label className={cx('m3e-switch-field', className)} data-disabled={disabled ? '' : undefined}>
      <span>{label}</span>
      {input}
    </label>
  )
}

/** The switch picture alone, for a row that is itself the control (e.g. a menuitemcheckbox). */
export function SwitchIndicator({ checked }: { checked: boolean }) {
  return <span aria-hidden="true" className="m3e-switch" data-checked={checked ? '' : undefined} />
}
