import type { ReactNode, Ref, SelectHTMLAttributes } from 'react'
import { Icon } from '../icon/Icon.tsx'
import { Field } from './Field.tsx'
import { useFieldControl, type FieldControlProps } from './TextField.tsx'

export type SelectProps = FieldControlProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, keyof FieldControlProps> & {
    /** <option> and <optgroup> elements. */
    children?: ReactNode
    ref?: Ref<HTMLSelectElement>
  }

/**
 * Label, native <select> with `.m3e-input` and hint/error. Single-line selects opt out of native
 * menulist chrome (`appearance: none`) with a kit chevron so their height matches TextField across
 * engines (notably WebKitGTK); `size` > 1 or `multiple` stay a native list box.
 */
export function Select({ label, hint, error, variant = 'filled', className, children, ...rest }: SelectProps) {
  const wiring = useFieldControl(rest, hint, error, variant)
  const listbox = Boolean(rest.multiple || (rest.size !== undefined && rest.size > 1))
  return (
    <Field label={label} hint={hint} error={error} htmlFor={wiring.id} className={className}>
      {listbox ? (
        <select {...rest} {...wiring}>
          {children}
        </select>
      ) : (
        <div data-part="control">
          <select {...rest} {...wiring} data-trailing="">
            {children}
          </select>
          <span data-part="chevron" aria-hidden="true">
            <Icon name="arrow_drop_down" size={20} />
          </span>
        </div>
      )}
    </Field>
  )
}
