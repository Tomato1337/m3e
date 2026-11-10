import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx.ts'

export type FieldProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** Visible label above the content. */
  label?: ReactNode
  /** Help text below the content; replaced by `error`. */
  hint?: ReactNode
  /** Error text below the content, instead of `hint`. */
  error?: ReactNode
  /**
   * id of the control inside. With it the root is a <div> and the label a `<label for>`, and the
   * hint/error get the ids `${htmlFor}-hint` / `${htmlFor}-error` for `aria-describedby`. Without it
   * the root is a <label> wrapping everything (its hint text is then part of the control's name).
   */
  htmlFor?: string
  children?: ReactNode
}

/** id of a field's hint or error element, for `aria-describedby` on the control. */
export const fieldHintId = (id: string) => `${id}-hint`
export const fieldErrorId = (id: string) => `${id}-error`

/** Label above, hint or error below, any control inside. */
export function Field({ label, hint, error, htmlFor, className, children, ...rest }: FieldProps) {
  const note = error ? (
    <span data-part="error" id={htmlFor ? fieldErrorId(htmlFor) : undefined}>{error}</span>
  ) : hint ? (
    <span data-part="hint" id={htmlFor ? fieldHintId(htmlFor) : undefined}>{hint}</span>
  ) : null
  if (htmlFor !== undefined) {
    return (
      <div className={cx('m3e-field', className)} {...rest}>
        {label && <label data-part="label" htmlFor={htmlFor}>{label}</label>}
        {children}
        {note}
      </div>
    )
  }
  return (
    <label className={cx('m3e-field', className)} {...rest}>
      {label && <span data-part="label">{label}</span>}
      {children}
      {note}
    </label>
  )
}
