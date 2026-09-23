import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-control-md w-full rounded-control border border-line-strong bg-panel px-3 text-base text-fg placeholder:text-fg-subtle focus-visible:border-accent disabled:cursor-not-allowed disabled:bg-well disabled:text-fg-muted',
        className,
      )}
      {...props}
    />
  );
}
