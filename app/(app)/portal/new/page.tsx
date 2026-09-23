import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../../components/data-table/states';
import { SubmitForm } from './submit-form';

export const metadata: Metadata = { title: 'Raise Ticket — Claim Desk' };

export default async function NewTicketPage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Raise a Request</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Raise a Request</h1>
        <PermissionDenied requiredPermission="tickets:create" />
      </div>
    );
  }

  const res = await fetchAsCaller('/api/projects');
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Raise a Request</h1>
        <ErrorState message="Failed to load projects list." />
      </div>
    );
  }

  const projects = await res.json();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Raise a Ticket</h1>
        <p className="text-xs text-fg-muted">File a request or bug report to receive a trackable reference.</p>
      </div>

      <SubmitForm projects={projects} />
    </div>
  );
}
