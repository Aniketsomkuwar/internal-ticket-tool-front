import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../components/data-table/states';
import { WatchtowerClient } from './watchtower-client';

export const metadata: Metadata = { title: 'Watchtower Attention — Claim Desk' };

export default async function WatchtowerPage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Watchtower</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Watchtower</h1>
        <PermissionDenied requiredPermission="tasks:read" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canRead = permissions.includes('tasks:read') || permissions.includes('admin:access');
  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Watchtower</h1>
        <PermissionDenied requiredPermission="tasks:read" />
      </div>
    );
  }

  const [watchtowerRes, projectsRes] = await Promise.all([
    fetchAsCaller('/api/watchtower'),
    fetchAsCaller('/api/projects'),
  ]);

  if (!watchtowerRes.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Watchtower</h1>
        <ErrorState message="Failed to load attention analytics." />
      </div>
    );
  }

  const data = await watchtowerRes.json();
  const projects = projectsRes.ok ? await projectsRes.json() : [];

  return <WatchtowerClient initialData={data} projects={projects} />;
}
