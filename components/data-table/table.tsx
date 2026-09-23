import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

import { cn } from '../../lib/cn';

/**
 * Table primitives.
 *
 * Thin wrappers, deliberately not a configurable `<DataTable columns={...}>`: the
 * tables in this product share a visual language but not a column model, and a
 * generic component that fit both would grow an escape hatch per caller within a
 * week. These wrappers own the things that are the same every time and easy to
 * forget:
 *
 *   - `TableRegion` owns horizontal scrolling, so a dense table never pushes the
 *     page sideways - the most common way a dashboard breaks on a small screen;
 *   - `Table` requires a caption and renders it `sr-only`, because a table
 *     without one is announced as unlabelled;
 *   - `TH` always carries `scope="col"` and only reports `aria-sort` when the
 *     caller has actually sorted by it;
 *   - numeric cells are right-aligned in the mono stack with tabular figures, so
 *     digits line up column-wise and a changing value does not shift its row.
 *
 * All of them are server-component safe: no state, no handlers.
 */

export function TableRegion({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-surface border border-line bg-panel', className)} {...rest}>
      {children}
    </div>
  );
}

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Announced by a screen reader, never drawn. Required: an unlabelled table is not readable. */
  caption: string;
  children: ReactNode;
}

export function Table({ caption, children, className, ...rest }: TableProps) {
  return (
    <table className={cn('w-full border-collapse text-sm', className)} {...rest}>
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  );
}

/** Sticky so a long table keeps its column names while the body scrolls. */
export function THead({ children, className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('sticky top-0 z-sticky bg-well', className)} {...rest}>
      {children}
    </thead>
  );
}

export function TBody({ children, className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  );
}

export function TR({ children, className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('border-b border-line last:border-b-0 hover:bg-hover', className)} {...rest}>
      {children}
    </tr>
  );
}

export type SortDirection = 'ascending' | 'descending';

export interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Passing a direction is what claims a sort; omitting it leaves `aria-sort` off entirely. */
  sorted?: SortDirection;
  /** Right-aligned, for a column of numbers. */
  numeric?: boolean;
}

export function TH({ sorted, numeric, className, children, ...rest }: THProps) {
  return (
    <th
      scope="col"
      aria-sort={sorted}
      className={cn(
        'uppercase-label h-control-md whitespace-nowrap border-b border-line px-3 text-left font-semibold',
        numeric && 'text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Mono, tabular, right-aligned: for IDs, counts, timestamps and amounts. */
  numeric?: boolean;
}

export function TD({ numeric, className, children, ...rest }: TDProps) {
  return (
    <td
      className={cn(
        'px-3 py-2 align-middle text-fg',
        numeric && 'text-right font-mono tabular text-xs text-fg-muted',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
