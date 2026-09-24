import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ROLE_LABELS, ROLES, type Role } from '@/shared/index';

import { ErrorState, PermissionDenied } from '../../../components/data-table/states';
import { TBody, TD, TH, THead, TR, Table, TableRegion } from '../../../components/data-table/table';
import { formatElapsed, formatTimestamp } from '../../../lib/format';
import { fetchAsCaller, getSessionState } from '../../../lib/session';

/**
 * The administrator area (R009, R060).
 *
 * This page is the slice's demo. A caller whose role does not hold
 * `admin:access` gets the permission-denied panel naming that key - not a thrown
 * error, not a blank page, not a redirect. The API's 403 is what tells the page
 * so: the page asks, the server refuses, and the refusal is rendered as a
 * sentence rather than as a crash. A role that *does* hold the key reads the
 * control-room counts.
 *
 * The route itself carries no client-side permission check, deliberately. A
 * check in the browser would be decoration; the guard that matters is
 * `requirePermission('admin:access')` on the API route, and this page is
 * evidence of it.
 */

export const metadata: Metadata = { title: 'Admin' };

interface Overview {
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<Role, number>;
  };
  sessions: { live: number };
  generatedAt: string;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-panel p-3">
      <p className="uppercase-label">{label}</p>
      <p className="font-mono tabular text-lg text-fg">{value}</p>
      {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

export default async function AdminPage() {
  const state = await getSessionState();

  if (state.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-group">
        <h1 className="text-xl text-fg">Admin</h1>
        <ErrorState
          title="The Claim Desk API is not answering"
          message={state.error.message}
          className="measure-form"
        />
      </div>
    );
  }

  if (state.status !== 'authenticated') {
    redirect('/login');
  }

  const { user } = state;
  const result = await fetchAsCaller<Overview>('/api/admin/overview');

  if (!result.ok) {
    // A 401 here means the session ended between the layout's read and this
    // one; that is a sign-in problem, not a permission problem.
    if (result.error.code === 'UNAUTHENTICATED') {
      redirect('/login');
    }

    return (
      <div className="flex flex-col gap-group">
        <h1 className="text-xl text-fg">Admin</h1>
        {result.error.code === 'PERMISSION_DENIED' ? (
          <PermissionDenied
            // Named by the API, not assumed by this page: the key comes back in
            // the refusal's details, so the panel cannot name the wrong one.
            permission={result.error.details?.requiredPermission ?? 'admin:access'}
            roleLabel={ROLE_LABELS[user.role]}
            source="request"
          />
        ) : (
          <ErrorState title="The administrator overview could not load" message={result.error.message} />
        )}
      </div>
    );
  }

  const overview = result.data;
  const roleCounts = ROLES.map((role) => ({ role, count: overview.users.byRole[role] ?? 0 }));

  return (
    <div className="flex flex-col gap-section">
      <header className="flex flex-col gap-control">
        <h1 className="text-xl text-fg">Admin</h1>
        <p className="measure text-sm text-fg-muted">
          Counts read from the API as {ROLE_LABELS[user.role]}, at{' '}
          <span title={formatTimestamp(overview.generatedAt)}>
            {formatElapsed(overview.generatedAt)}
          </span>
          .
        </p>
      </header>

      <section className="flex flex-col gap-group">
        <h2 className="uppercase-label">Control room</h2>
        {/* Dividers are the grid gap over a border-coloured ground, not a border
            on each cell: one line between cells instead of a doubled one. */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-surface border border-line bg-line sm:grid-cols-4">
          <Kpi label="Users" value={String(overview.users.total)} />
          <Kpi label="Active" value={String(overview.users.active)} />
          <Kpi label="Inactive" value={String(overview.users.inactive)} />
          <Kpi label="Live sessions" value={String(overview.sessions.live)} hint="Not yet expired" />
        </div>
      </section>

      <section className="flex flex-col gap-group">
        <h2 className="uppercase-label">Users by role</h2>
        <TableRegion>
          <Table caption="Users by role">
            <THead>
              <TR>
                <TH>Role</TH>
                <TH numeric>Users</TH>
              </TR>
            </THead>
            <TBody>
              {roleCounts.map(({ role, count }) => (
                <TR key={role}>
                  <TD>{ROLE_LABELS[role]}</TD>
                  <TD numeric>{count}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableRegion>
      </section>
    </div>
  );
}
