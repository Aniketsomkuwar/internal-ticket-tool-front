'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Optional; generated when omitted so a label is always wired to its input. */
  id?: string;
  /** Guidance shown under the control and announced through `aria-describedby`. */
  hint?: string;
  /** Validation message. The paragraph holds its height either way. */
  error?: string;
}

/**
 * Labelled input owning its hint, its error text and the password visibility
 * toggle, so no screen rebuilds that wiring by hand. It is a client component
 * because the visibility toggle is state; a server component can still render
 * it, since every prop it takes is a string or a plain input attribute.
 */
export function Field({
  label,
  id,
  hint,
  error,
  type = 'text',
  className,
  ...rest
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? `field-${generatedId}`;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = `${fieldId}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-control', className)}>
      <label className="text-sm font-medium text-fg" htmlFor={fieldId}>
        {label}
      </label>

      <div className="relative">
        <input
          {...rest}
          id={fieldId}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-control-md w-full rounded-control border border-line-strong bg-panel px-3 text-base text-fg',
            'placeholder:text-fg-subtle focus-visible:border-accent',
            'disabled:cursor-not-allowed disabled:bg-well disabled:text-fg-muted',
            isPassword && 'pr-12',
            error && 'border-danger',
          )}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-pressed={revealed}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-fg-muted transition-colors duration-exit hover:text-fg"
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        ) : null}
      </div>

      {hint ? (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}

      {/* Rendered even when empty, with its height reserved by `.field-error`,
          so the submit button below does not jump under the cursor when
          validation fires. */}
      <p id={errorId} role={error ? 'alert' : undefined} className="field-error text-xs font-medium text-danger">
        {error ?? ''}
      </p>
    </div>
  );
}
