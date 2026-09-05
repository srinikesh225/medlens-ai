import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'sm'

/**
 * `primary` is the only place the accent colour appears on a control.
 * Everything else is neutral, so a screen never has two competing calls
 * to action.
 */
const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-inverse hover:brightness-110 active:brightness-95',
  secondary: 'bg-card text-ink border border-border hover:bg-sunken',
  ghost: 'text-secondary hover:bg-sunken hover:text-ink',
}

const SIZE: Record<Size, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1 text-xs',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

function classes(variant: Variant, size: Size, className: string) {
  return `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...rest
}: {
  children: ReactNode
  variant?: Variant
  size?: Size
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  )
}

/** Same visual language for navigation that happens to be a link. */
export function ButtonLink({
  to,
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...rest
}: {
  to: string
  children: ReactNode
  variant?: Variant
  size?: Size
  className?: string
  'aria-label'?: string
  title?: string
}) {
  return (
    <Link to={to} className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  )
}
