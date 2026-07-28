import type { ReactNode } from 'react'

interface CommandButtonProps {
  readonly children: ReactNode
  readonly onClick: () => void
  readonly disabled?: boolean
  /** Marks a toggle as the active choice, and inverts it so the state is visible. */
  readonly pressed?: boolean
  readonly ariaLabel?: string
  readonly className?: string
}

/**
 * Every control in the game: black, thin white rule, uppercase, inverting on hover.
 *
 * One component rather than a class string copied across screens, so the controls cannot
 * drift apart and the focus treatment is defined once.
 */
export function CommandButton({
  children,
  onClick,
  disabled,
  pressed,
  ariaLabel,
  className = '',
}: CommandButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled ?? false}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
      className={`border px-3 py-2 text-xs tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk ${
        pressed
          ? 'border-chalk bg-chalk text-ink'
          : 'border-chalk/70 bg-ink text-chalk hover:bg-chalk hover:text-ink'
      } disabled:cursor-not-allowed disabled:border-edge disabled:bg-ink disabled:text-fog disabled:hover:bg-ink disabled:hover:text-fog ${className}`}
    >
      {children}
    </button>
  )
}
