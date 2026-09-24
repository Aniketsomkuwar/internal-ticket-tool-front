import { redirect } from 'next/navigation';
import { ROLE_LABELS } from '@/shared/index';
import type { ReactNode } from 'react';

import { ErrorState } from '../../components/data-table/states';
import { Shell } from '../../components/shell/shell';
import { getSessionState } from '../../lib/session';

/**
 * The signed-in layout (R003).
 *
 * The session is read here, on the server, and the permission list is resolved
 * by the API - not by the browser, not from a token in `localStorage`, and not
 * from anything the caller could edit. The shell that filters its navigation on
 * that list is a client component, but it receives the list as a prop, so there
 * is no way to widen it from the client.
 *
 * Three outcomes, three screens: signed in renders the shell, no session
 * redirects to the sign-in page, and an unreachable API renders a retry rather
 * than a redirect. That last one matters - sending somebody to a sign-in form
 * because the API is restarting gives them a password prompt that also cannot
 * work, and hides the outage behind a credentials error.
 */

export default async function AppLayout({ children }: { children: ReactNode }) {
  const state = await getSessionState();

  if (state.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-group p-6">
        <h1 className="text-xl text-fg">Claim Desk</h1>
        <ErrorState
          title="The Claim Desk API is not answering"
          message={state.error.message}
          retryLabel="Try again"
          className="measure-form"
        />
      </div>
    );
  }

  if (state.status !== 'authenticated' || !state.user) {
    redirect('/login');
  }

  const { user } = state;

  return (
    <Shell
      session={{
        name: user.profile.fullName || user.username || user.email,
        email: user.email,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role],
        permissions: user.permissions,
      }}
    >
      {children}
    </Shell>
  );
}
