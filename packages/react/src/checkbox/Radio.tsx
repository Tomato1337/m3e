import { Choice, type ChoiceProps } from './Checkbox.tsx'

export type RadioProps = ChoiceProps & {
  /** Group name shared by the radios of one choice. */
  name?: string
  value?: string
}

/**
 * Native radio button in the primary accent colour, with an optional label row. `onChange(true)`
 * fires when it becomes checked; keep `checked` in the caller (`checked={value === 'a'}`).
 */
export function Radio(props: RadioProps) {
  return <Choice {...props} type="radio" />
}
