import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../components/data-table/states';
import { ConsoleClient } from './console-client';

export const metadata: Metadata = { title: 'Support Console — Claim Desk' };

interface ConsolePageProps {
  searchParams: { queue?: string };
}

export default async function TicketsConsolePage({ searchParams }: ConsolePageProps) {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Tickets Console</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Tickets Console</h1>
        <PermissionDenied requiredPermission="tickets:claim" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canAccess = permissions.includes('tickets:claim') || permissions.includes('admin:access');
  if (!canAccess) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Tickets Console</h1>
        <PermissionDenied requiredPermission="tickets:claim" />
      </div>
    );
  }

  const currentQueue = searchParams.queue || 'all';

  const [ticketsRes, countsRes, usersRes] = await Promise.all([
    fetchAsCaller(`/api/tickets?queue=${currentQueue}&pageSize=50`),
    fetchAsCaller('/api/tickets/queue-counts'),
    fetchAsCaller('/api/users?pageSize=100'),
  ]);

  if (!ticketsRes.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Tickets Console</h1>
        <ErrorState message="Failed to load tickets queue." />
      </div>
    );
  }

  const ticketsData = await ticketsRes.json();
  const counts = countsRes.ok ? await countsRes.json() : { all: 0, unclaimed: 0, my_tickets: 0, urgent: 0 };
  const usersData = usersRes.ok ? await usersRes.json() : { users: [] };

  const staffMembers = (usersData.users ?? []).map((u: any) => ({
    id: u.id,
    name: u.fullName || u.username,
  }));

  const canAssign = permissions.includes('tickets:assign') || permissions.includes('admin:access');

  return (
    <ConsoleClient
      initialTickets={ticketsData.tickets ?? []}
      counts={counts}
      currentQueue={currentQueue}
      staffMembers={staffMembers}
      canAssign={canAssign}
    />
  );
}
