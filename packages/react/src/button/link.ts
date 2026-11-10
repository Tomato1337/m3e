import type { AnchorHTMLAttributes, MouseEventHandler } from 'react'

/** `Omit` applied to each member of a union, so button/link props stay distinguishable. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** Extra props of the link form of a button: `href` renders an <a>; `disabled` is emulated. */
export type LinkOnlyProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  /** A link has no disabled state: it drops `href` and is marked `aria-disabled` / `data-disabled`. */
  disabled?: boolean
}

/**
 * Attributes for an <a> that renders a button. `selected` marks the current page; a disabled link
 * loses its `href` (so it is not focusable or followable) and its click handler, like a disabled
 * button. It uses `data-disabled` for styling: `aria-disabled` on kit buttons already means "busy"
 * (snackbar actions).
 */
export function linkAttrs(href: string, disabled: boolean | undefined, selected: boolean | undefined, onClick: MouseEventHandler<HTMLAnchorElement> | undefined) {
  return disabled
    ? { role: 'link', 'aria-disabled': true, 'aria-current': selected ? ('page' as const) : undefined, 'data-disabled': '' }
    : { href, 'aria-current': selected ? ('page' as const) : undefined, onClick }
}
