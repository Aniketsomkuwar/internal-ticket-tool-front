import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../components/data-table/states';
import { OrgChartClient, type OrgChartData } from './org-client';

export const metadata: Metadata = { title: 'Org Chart — Claim Desk' };

export default async function OrgChartPage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Org Chart</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Org Chart</h1>
        <PermissionDenied requiredPermission="org:read" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canRead = permissions.includes('org:read') || permissions.includes('admin:access');
  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Org Chart</h1>
        <PermissionDenied requiredPermission="org:read" />
      </div>
    );
  }

  const canAssignManager = permissions.includes('user:write') || permissions.includes('admin:access');

  const [chartRes, usersRes] = await Promise.all([
    fetchAsCaller('/api/org-chart'),
    fetchAsCaller('/api/users?pageSize=100'),
  ]);

  if (!chartRes.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Org Chart</h1>
        <ErrorState message="Failed to load organization hierarchy." />
      </div>
    );
  }

  const chartData: OrgChartData = await chartRes.json();
  const usersData = usersRes.ok ? await usersRes.json() : { users: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Organization Chart</h1>
        <p className="text-xs text-fg-muted">
          Company reporting hierarchy and team structure.
        </p>
      </div>

      <OrgChartClient
        initialData={chartData}
        allUsers={usersData.users}
        canAssignManager={canAssignManager}
      />
    </div>
  );
}
