'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';

/**
 * The five states every data view ships (R006).
 *
 * Loading, nothing-here-yet, no-results-for-these-filters, inline error with
 * retry, and permission denied. They are one module on purpose: the distinction
 * that matters is between the *second* and the *third* - "no tickets" and "no
 * tickets match your filter" send a reader to two different places, and a view
 * that renders the wrong one sends them looking for a bug.
 *
 * This module is a client boundary because of the retry. Retrying a server
 * component means re-running its render, which is `router.refresh()`; a plain
 * link back to the same URL can be treated as a no-op navigation. Everything
 * else here is presentational, so a server page renders these without losing
 * anything - the markup is still in the server's HTML.
 */

export { PermissionDenied } from '../permission-denied';

export interface SkeletonRowsProps {
  /**
   * The real table's column count, passed in rather than guessed: a skeleton
   * that collapses to two columns and then jumps to seven is worse than none.
   */
  columns: number;
  rows?: number;
  className?: string;
}

/** Placeholder rows for a table that is still loading. Rendered inside a `TBody`. */
export function SkeletonRows({ columns, rows = 5, className }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true" className={cn('border-b border-line last:border-b-0', className)}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex} className="px-3 py-3">
              <span className="block h-control-sm w-full rounded-control bg-well" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface StatePanelProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
  className?: string;
}

function StatePanel({ title, children, action, tone = 'neutral', className }: StatePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-control rounded-surface border p-4',
        tone === 'error' ? 'border-danger-line bg-danger-soft' : 'border-line bg-panel',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className={cn('text-sm font-medium', tone === 'error' ? 'text-danger' : 'text-fg')}>{title}</p>
        {children ? <p className="measure text-sm text-fg-muted">{children}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-control">{action}</div> : null}
    </div>
  );
}

export interface EmptyStateProps {
  /** "Nothing here yet" by default; a caller with a more specific emptiness says so. */
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** There is genuinely nothing yet - a new install, a first week. */
export function EmptyState({ title = 'Nothing here yet', children, action, className }: EmptyStateProps) {
  return (
    <StatePanel title={title} action={action} className={className}>
      {children}
    </StatePanel>
  );
}

export interface NoResultsStateProps {
  title?: string;
  children?: ReactNode;
  /** The unfiltered URL. Required: "clear filters" has to go somewhere. */
  clearHref: string;
  clearLabel?: string;
  className?: string;
}

/**
 * There are rows, but none match these filters. Deliberately a separate state
 * from `EmptyState`: conflating them is how a filter bug gets reported as
 * missing data.
 */
export function NoResultsState({
  title = 'No results for these filters',
  children,
  clearHref,
  clearLabel = 'Clear filters',
  className,
}: NoResultsStateProps) {
  return (
    <StatePanel
      title={title}
      className={className}
      action={
        <Link
          href={clearHref}
          className="inline-flex h-control-sm items-center rounded-control border border-line-strong bg-panel px-3 text-sm text-fg hover:bg-hover"
        >
          {clearLabel}
        </Link>
      }
    >
      {children}
    </StatePanel>
  );
}

export interface ErrorStateProps {
  title?: string;
  /** The API's own message when it has one; a transport failure's otherwise. */
  message: string;
  /** What is being retried, for the button label: "Try again" by default. */
  retryLabel?: string;
  className?: string;
}

/**
 * Inline, human-readable, with a retry. Never a stack: the failure worth
 * showing a reader is "this did not load", and the diagnostic belongs in the
 * server log, which is where `lib/api.ts` puts it.
 */
export function ErrorState({
  title = 'This section could not load',
  message,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  const router = useRouter();

  return (
    <div className={cn('flex flex-col gap-control', className)}>
      <Alert tone="error" title={title}>
        {message}
      </Alert>
      <div>
        <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}
