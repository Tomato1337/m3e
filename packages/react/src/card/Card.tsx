import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx.ts'

export type CardVariant = 'filled' | 'outlined'

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  variant?: CardVariant
  /** Heading (h3, title-small) above the content. */
  title?: ReactNode
  /** Accessible name (aria-label); makes the section a region landmark. */
  label?: string
}

/** A grouped block of content: filled surface or outlined box, 12 px between children. */
export function Card({ variant = 'filled', title, label, className, children, ...rest }: CardProps) {
  return (
    <section aria-label={label} data-variant={variant} className={cx('m3e-card', className)} {...rest}>
      {title && <h3 data-part="title">{title}</h3>}
      {children}
    </section>
  )
}
