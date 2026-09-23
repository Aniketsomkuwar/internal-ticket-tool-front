import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type AlertTone = 'error' | 'warning' | 'info' | 'success';

interface ToneStyle {
  /** The glyph and feedback token family this tone draws on. */
  token: 'danger' | 'warning' | 'info' | 'success';
  /** The written label, because the glyph alone is not a signal. */
  label: string;
  className: string;
}

const TONE: Record<AlertTone, ToneStyle> = {
  // `error` is the caller-facing name; `danger` is the token family.
  error: { token: 'danger', label: 'Error', className: 'bg-danger-soft border-danger-line text-danger' },
  warning: { token: 'warning', label: 'Warning', className: 'bg-warning-soft border-warning-line text-warning' },
  info: { token: 'info', label: 'Note', className: 'bg-info-soft border-info-line text-info' },
  success: { token: 'success', label: 'Success', className: 'bg-success-soft border-success-line text-success' },
};

export interface AlertProps {
  tone?: AlertTone;
  /** Replaces the tone's default label in the written prefix. */
  title?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * A banner or an inline validation message. Every tone carries a glyph *and* a
 * written label: colour is never the only signal, which fails for colour
 * blindness and fails again for anyone reading a screenshot pasted into a
 * ticket. An error announces itself (`role="alert"`), because a form that fails
 * silently is a form people submit repeatedly.
 */
export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { token, label, className: toneClassName } = TONE[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-control rounded-surface border px-3 py-2 text-sm',
        toneClassName,
        className,
      )}
    >
      <span aria-hidden="true" data-glyph={token} className="glyph mt-1" />
      <p className="measure">
        <span className="font-semibold">{title ?? label}:</span> <span>{children}</span>
      </p>
    </div>
  );
}
