import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cx } from '../cx.ts'

type ListGroupOwnProps = {
  /** Underlying container element (default `'div'`). */
  as?: 'div' | 'ul'
  children?: ReactNode
}

export type ListGroupAsDiv = ListGroupOwnProps &
  Omit<HTMLAttributes<HTMLDivElement>, keyof ListGroupOwnProps> & {
    as?: 'div'
    ref?: Ref<HTMLDivElement>
  }

export type ListGroupAsList = ListGroupOwnProps &
  Omit<HTMLAttributes<HTMLUListElement>, keyof ListGroupOwnProps> & {
    as: 'ul'
    ref?: Ref<HTMLUListElement>
  }

export type ListGroupProps = ListGroupAsDiv | ListGroupAsList

/**
 * M3 Expressive grouped list container: 2 px gap between items, 4 px inner corners and 24 px
 * outer corners (all four corners on a single-item list).
 */
export function ListGroup(props: ListGroupProps) {
  if (props.as === 'ul') {
    const { className, children, ref, as, ...rest } = props
    void as
    return (
      <ul ref={ref} className={cx('m3e-list-group', className)} {...rest}>
        {children}
      </ul>
    )
  }
  const { className, children, ref, as, ...rest } = props
  void as
  return (
    <div ref={ref} className={cx('m3e-list-group', className)} {...rest}>
      {children}
    </div>
  )
}
