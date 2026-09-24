import type { Metadata } from 'next';
import { ROLE_LABELS } from '@/shared/index';

import { ErrorState, EmptyState, PermissionDenied } from '../../components/data-table/states';
import { TBody, TD, TH, THead, TR, Table, TableRegion } from '../../components/data-table/table';
import { PLACEHOLDER, formatElapsed, formatElapsedTitle } from '../../lib/format';
import { fetchAsCaller, getSessionState } from '../../lib/session';

/**
 * The signed-in landing page (R003, R006).
 *
 * A server component: the session it draws was resolved on the server, and the
 * audit read it makes is made with the caller's own cookie. It names the role,
 * lists the permissions that role actually holds - the same list the navigation
 * filters on - and renders the most recent audit entries.
 *
 * The audit section is the visible half of the permission gate. A role without
 * `audit:read` is not shown a hidden section: it is shown the permission-denied
 * panel naming `audit:read`, because a silently missing section is
 * indistinguishable from a broken build, and "the refusal is visible" is the
 * point of the slice.
 */

export const metadata: Metadata = { title: 'Overview' };

/** Small on purpose: this is a glance at recent activity, not the trail screen. */
const RECENT_ACTIVITY_ROWS = 8;

interface AuditActor {
  id: string;
  username: string | null;
  email: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  resourceType: string | null;
  resourceId: string | null;
  actor: AuditActor | null;
}

interface AuditPage {
  entries: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default async function OverviewPage() {
  const state = await getSessionState();

  if (state.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-group">
        <h1 className="text-xl text-fg">Overview</h1>
        <ErrorState
          title="The Claim Desk API is not answering"
          message={state.error.message}
          className="measure-form"
        />
      </div>
    );
  }

  // The layout above already redirects a signed-out caller; this keeps the page
  // honest if it is ever rendered on its own.
  if (state.status !== 'authenticated') {
    return null;
  }

  const { user } = state;

  // Overview is only visible to admin so admin can inspect audit changes; redirect all other users
  if (user.role !== 'admin') {
    const { redirect } = await import('next/navigation');
    redirect('/dashboard');
  }

  const canReadAudit = user.permissions.includes('audit:read') || user.permissions.includes('admin:access');
  const audit = canReadAudit
    ? await fetchAsCaller<AuditPage>(`/api/admin/audit?page=1&pageSize=${RECENT_ACTIVITY_ROWS}`)
    : null;

  return (
    <div className="flex flex-col gap-section">
      <header className="flex flex-col gap-control">
        <h1 className="text-xl text-fg">Overview</h1>
        <p className="measure text-sm text-fg-muted">
          Signed in as{' '}
          <span className="font-medium text-fg">
            {user.profile.fullName || user.username || user.email}
          </span>
          . Recent activity across projects and the system.
        </p>
      </header>

      <section className="flex flex-col gap-group">
        <h2 className="uppercase-label">Recent activity</h2>

        {!audit ? (
          <PermissionDenied permission="audit:read" roleLabel={ROLE_LABELS[user.role]} />
        ) : !audit.ok ? (
          audit.error.code === 'PERMISSION_DENIED' ? (
            <PermissionDenied
              permission={audit.error.details?.requiredPermission ?? 'audit:read'}
              roleLabel={ROLE_LABELS[user.role]}
              source="request"
            />
          ) : (
            <ErrorState title="The activity trail could not load" message={audit.error.message} />
          )
        ) : audit.data.entries.length === 0 ? (
          <EmptyState title="Nothing has been recorded yet">
            The audit trail fills as people sign in and administrators change things. The first entry
            appears the moment somebody does either.
          </EmptyState>
        ) : (
          <>
            <TableRegion>
              <Table caption="Recent activity from the audit trail, newest first">
                <THead>
                  <TR>
                    <TH>When</TH>
                    <TH>Action</TH>
                    <TH>Actor</TH>
                    <TH>Resource</TH>
                  </TR>
                </THead>
                <TBody>
                  {audit.data.entries.map((entry) => (
                    <TR key={entry.id}>
                      <TD className="whitespace-nowrap" title={formatElapsedTitle(entry.timestamp)}>
                        {formatElapsed(entry.timestamp)}
                      </TD>
                      <TD>
                        <code className="font-mono text-xs">{entry.action}</code>
                      </TD>
                      <TD>{entry.actor?.username ?? entry.actor?.email ?? PLACEHOLDER}</TD>
                      <TD>{entry.resourceId ?? PLACEHOLDER}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableRegion>
            <p className="text-xs text-fg-subtle">
              Showing the {audit.data.entries.length} most recent of {audit.data.total} recorded
              events.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
