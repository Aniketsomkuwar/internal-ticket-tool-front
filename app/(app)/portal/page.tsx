import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../components/data-table/states';
import { PortalClient } from './portal-client';

export const metadata: Metadata = { title: 'Client Portal — Claim Desk' };

export default async function PortalPage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Client Portal</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Client Portal</h1>
        <PermissionDenied requiredPermission="tickets:read" />
      </div>
    );
  }

  const res = await fetchAsCaller('/api/tickets?pageSize=100');
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Client Portal</h1>
        <ErrorState message="Failed to load your tickets." />
      </div>
    );
  }

  const data = await res.json();

  return <PortalClient initialTickets={data.tickets ?? []} />;
}
