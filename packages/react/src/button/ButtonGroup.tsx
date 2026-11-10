import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx.ts'
import { Button, type ButtonProps } from './Button.tsx'
import type { DistributiveOmit } from './link.ts'

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  /** Accessible name of the group. */
  label: string
  /**
   * Connected group (M3 Expressive): buttons touch with tight inner corners and pill outer ends;
   * a selected button morphs to a full pill. Replaces the deprecated segmented button.
   */
  connected?: boolean
  children: ReactNode
}

/** A row of related buttons announced as one group. */
export function ButtonGroup({ label, connected, className, children, ...rest }: ButtonGroupProps) {
  return (
    <div role="group" aria-label={label} data-connected={connected ? '' : undefined} className={cx('m3e-button-group', className)} {...rest}>
      {children}
    </div>
  )
}

/**
 * A two-state button for groups: `selected` ⇒ aria-pressed. With `href` it is a link and `selected`
 * marks the current page (aria-current), so a connected group can be navigation.
 */
export function ToggleButton({ selected, ...rest }: DistributiveOmit<ButtonProps, 'variant' | 'selected'> & { selected: boolean }) {
  return <Button {...rest} variant="tonal" selected={selected} data-toggle="" />
}

/** Single choice from a few options, as a connected group of toggle buttons. */
export function Segmented<T extends string>({ value, options, onChange, label, size = 'sm', className }: {
  value: T
  options: readonly { value: T; label: string; icon?: string }[]
  onChange: (v: T) => void
  label: string
  size?: ButtonProps['size']
  className?: string
}) {
  return (
    <ButtonGroup label={label} connected className={className}>
      {options.map((o) => (
        <ToggleButton key={o.value} size={size} icon={o.icon} selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </ToggleButton>
      ))}
    </ButtonGroup>
  )
}
