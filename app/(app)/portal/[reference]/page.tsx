import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../../components/data-table/states';
import { ClientDetailView, type TicketDetailData } from './client-detail-view';

export const metadata: Metadata = { title: 'Ticket Detail — Claim Desk' };

interface PortalDetailProps {
  params: { reference: string };
}

export default async function PortalDetailPage({ params }: PortalDetailProps) {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Ticket</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Ticket</h1>
        <PermissionDenied requiredPermission="tickets:read" />
      </div>
    );
  }

  const res = await fetchAsCaller(`/api/tickets/${params.reference}`);
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Ticket</h1>
        <ErrorState message="Ticket not found or inaccessible." />
      </div>
    );
  }

  const ticket: TicketDetailData = await res.json();

  return <ClientDetailView ticket={ticket} userKind={session.user.role} />;
}
