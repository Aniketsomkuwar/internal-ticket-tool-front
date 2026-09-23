import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../../components/data-table/states';
import { EscalationClient, type EscalationRuleItem } from './escalation-client';

export const metadata: Metadata = { title: 'Escalation & Audit — Claim Desk' };

export default async function EscalationAdminPage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Escalation Automation</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Escalation Automation</h1>
        <PermissionDenied requiredPermission="escalation:read" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canAccess = permissions.includes('escalation:read') || permissions.includes('admin:access');
  if (!canAccess) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Escalation Automation</h1>
        <PermissionDenied requiredPermission="escalation:read" />
      </div>
    );
  }

  const res = await fetchAsCaller<EscalationRuleItem[]>('/api/escalation/rules');
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Escalation Automation</h1>
        <ErrorState message="Failed to load escalation rules." />
      </div>
    );
  }

  return <EscalationClient initialRules={res.data} />;
}
