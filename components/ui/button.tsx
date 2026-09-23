import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows the spinner, sets `aria-busy` and disables the button. */
  loading?: boolean;
  /**
   * Renders a navigation rather than an action: the control becomes an
   * `<a href>` wearing the same variant/size recipe.
   *
   * It exists because the alternative is a `<button onClick={() =>
   * router.push(...)}>`, which looks like a link, is announced as a button, and
   * cannot be middle-clicked, copied, or opened in a new tab - and which breaks
   * outright when scripting has not loaded yet. When `href` is set, `loading`,
   * `disabled` and `onClick` describe a button that is *doing* something and are
   * deliberately not forwarded.
   */
  href?: string;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg border-transparent hover:bg-accent-hover active:bg-accent-active',
  secondary: 'bg-panel text-fg border-line-strong hover:bg-hover active:bg-well',
  ghost: 'bg-transparent text-fg border-transparent hover:bg-hover active:bg-well',
  danger:
    'bg-danger-solid text-on-danger-solid border-transparent hover:bg-danger-solid-hover active:bg-danger-solid-active',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-3 gap-1 text-sm',
  md: 'h-control-md px-4 gap-2 text-base',
  lg: 'h-control-lg px-4 gap-2 text-md',
};

const SPINNER_SIZE: Record<ButtonSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
};

/**
 * Server-component safe: no state, no handlers of its own. A caller that needs
 * an `onClick` is already a client component, and passing one through is what
 * makes this a client component at that call site - the primitive itself does
 * not drag a `use client` boundary into a page that never needed one.
 *
 * `type` defaults to `button`, not `submit`: in a form, a button that was never
 * meant to submit causing a submit is a real data-loss bug, and forgetting the
 * attribute is the common case.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  href,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center rounded-surface border font-medium transition-colors duration-exit ease-standard',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT[variant],
    SIZE[size],
    className,
  );

  if (href !== undefined) {
    // A destination, not an action. Only the attributes that describe the link
    // itself cross over: `id`, `title` and `tabIndex`. Everything else the
    // caller passed is dropped - `onClick` above all, because a navigation with
    // a click handler is the very thing this prop replaces.
    const { id, title, tabIndex } = rest;

    return (
      <a href={href} id={id} title={title} tabIndex={tabIndex} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button
      {...rest}
      type={type}
      // The disabled attribute is what actually blocks a double submit, not the
      // state update that follows it.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className={cn('spinner rounded-pill border border-current border-t-transparent', SPINNER_SIZE[size])}
        />
      ) : null}
      {children}
    </button>
  );
}
