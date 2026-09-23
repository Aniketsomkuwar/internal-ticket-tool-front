import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-control-md rounded-control border border-line-strong bg-panel px-3 text-base text-fg focus-visible:border-accent disabled:cursor-not-allowed disabled:bg-well disabled:text-fg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
