import type { ReactNode, Ref, SelectHTMLAttributes } from 'react'
import { Field } from './Field.tsx'
import { useFieldControl, type FieldControlProps } from './TextField.tsx'

export type SelectProps = FieldControlProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, keyof FieldControlProps> & {
    /** <option> and <optgroup> elements. */
    children?: ReactNode
    ref?: Ref<HTMLSelectElement>
  }

/**
 * Label, native <select> with `.m3e-input` and hint/error. The system arrow stays; `size` > 1 or
 * `multiple` turn it into a list box. Every attribute and `onChange` reach the <select>.
 */
export function Select({ label, hint, error, variant = 'filled', className, children, ...rest }: SelectProps) {
  const wiring = useFieldControl(rest, hint, error, variant)
  return (
    <Field label={label} hint={hint} error={error} htmlFor={wiring.id} className={className}>
      <select {...rest} {...wiring}>
        {children}
      </select>
    </Field>
  )
}
