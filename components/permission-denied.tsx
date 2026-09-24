import { PERMISSION_LABELS, type Permission } from '@/shared/index';

import { cn } from '../lib/cn';

/**
 * The permission-denied panel (R060).
 *
 * One component behind both refusals a person can meet: a route their role
 * cannot open (the shell's navigation never offers it, but a bookmark or a
 * pasted link still lands there) and a 403 the API answered for a request a page
 * made on their behalf. Both are shown rather than hidden, because a screen that
 * silently drops the section it was refused leaves the reader unable to tell a
 * broken build from a missing permission.
 *
 * It says three things and no more: which key was missing, that the role does
 * not hold it, and who to ask. It never shows a status code, a stack or a raw
 * payload - those belong in the log and the audit trail, which is where the
 * server already put them.
 *
 * Server-component safe: no state, no handlers.
 */
export interface PermissionDeniedProps {
  /** The permission key that was required. Named in the copy, exactly as the API named it. */
  permission?: Permission | string;
  requiredPermission?: Permission | string;
  /** The human label for the caller's role, e.g. "Developer". */
  roleLabel?: string;
  /** Where the refusal came from, so the panel describes what actually happened. */
  source?: 'route' | 'request';
  className?: string;
}

export function PermissionDenied({
  permission,
  requiredPermission,
  roleLabel,
  source = 'route',
  className,
}: PermissionDeniedProps) {
  const effectivePermission = (permission || requiredPermission || 'admin:access') as string;
  const known = (PERMISSION_LABELS as Record<string, string | undefined>)[effectivePermission];

  return (
    <section
      // Read by the browser tests and by anyone inspecting a live page: the key
      // is part of the contract, so it is on the element, not only in the prose.
      data-permission={effectivePermission}
      className={cn('flex flex-col gap-group rounded-surface border border-line bg-panel p-4', className)}
    >
      <div className="flex items-start gap-control">
        <span aria-hidden="true" data-glyph="warning" className="glyph mt-1 text-warning" />
        <div className="flex flex-col gap-1">
          <h2 className="text-md text-fg">Permission denied</h2>
          <p className="measure text-sm text-fg-muted">
            {source === 'request'
              ? 'The server refused this request. '
              : 'This route is not open to your role. '}
            {roleLabel ? `The ${roleLabel} role does not hold ` : 'Your role does not hold '}
            <code className="rounded-control bg-well px-1 font-mono text-xs text-fg">{permission}</code>
            {known ? ` (${known.toLowerCase()})` : ''}.
          </p>
        </div>
      </div>

      <p className="measure text-sm text-fg-muted">
        Ask an administrator to grant{' '}
        <span className="font-medium text-fg">{permission}</span> to your role, or sign in with an
        account that already holds it.
      </p>
    </section>
  );
}
