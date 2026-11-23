import {
  useId,
  type AriaAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react'
import { cx } from '../cx.ts'
import { Field, fieldErrorId, fieldHintId } from './Field.tsx'

export type TextVariant = 'filled' | 'outlined'
export type InputVariant = TextVariant | 'pill'

/** Props shared by TextField and Select: the Field around the control. */
export type FieldControlProps<V extends InputVariant = TextVariant> = {
  label?: ReactNode
  hint?: ReactNode
  /** Replaces the hint and sets aria-invalid. */
  error?: ReactNode
  variant?: V
  /** Class of the Field root; every other attribute goes to the control. */
  className?: string
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, keyof FieldControlProps> & { ref?: Ref<HTMLInputElement> }
type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof FieldControlProps> & { ref?: Ref<HTMLTextAreaElement> }

export type TextFieldProps =
  | (FieldControlProps<InputVariant> &
      InputProps & {
        multiline?: false
        /** Content at the inline start of the input (e.g. a search icon); the input makes room. */
        leading?: ReactNode
        /** Content at the inline end of the input (e.g. a "show password" button); the input makes room. */
        trailing?: ReactNode
      })
  | (FieldControlProps & TextareaProps & { multiline: true; leading?: undefined; trailing?: undefined })

/** Id, description and validity wiring between a control and its Field. */
export function useFieldControl(
  control: { id?: string } & Pick<AriaAttributes, 'aria-describedby' | 'aria-invalid'>,
  hint: ReactNode,
  error: ReactNode,
  variant: InputVariant,
) {
  const auto = useId()
  const id = control.id ?? auto
  const note = error ? fieldErrorId(id) : hint ? fieldHintId(id) : undefined
  return {
    id,
    'aria-describedby': cx(control['aria-describedby'], note) || undefined,
    'aria-invalid': error ? true : control['aria-invalid'],
    'data-variant': variant === 'filled' ? undefined : variant,
    className: 'm3e-input',
  }
}

/**
 * Label, `.m3e-input` and hint/error. A native <input> (or <textarea> with `multiline`): every
 * attribute and `onChange` reach it unchanged; `ref` points at it. Without `label`, name it with
 * `aria-label`.
 */
export function TextField({ label, hint, error, variant = 'filled', className, multiline, leading, trailing, ...rest }: TextFieldProps) {
  const wiring = useFieldControl(rest, hint, error, variant)
  const field = { label, hint, error, htmlFor: wiring.id, className }
  if (multiline) {
    return (
      <Field {...field}>
        <textarea {...(rest as TextareaProps)} {...wiring} />
      </Field>
    )
  }
  const input = (
    <input
      {...(rest as InputProps)}
      {...wiring}
      data-leading={leading ? '' : undefined}
      data-trailing={trailing ? '' : undefined}
    />
  )
  return (
    <Field {...field}>
      {leading || trailing ? (
        <div data-part="control">
          {leading && <span data-part="leading">{leading}</span>}
          {input}
          {trailing && <span data-part="trailing">{trailing}</span>}
        </div>
      ) : (
        input
      )}
    </Field>
  )
}
