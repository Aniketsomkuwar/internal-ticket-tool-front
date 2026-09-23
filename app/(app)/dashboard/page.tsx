import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../components/data-table/states';
import { DashboardClient } from './dashboard-client';

export const metadata: Metadata = { title: 'Unified Dashboard — Claim Desk' };

interface DashboardPageProps {
  searchParams: { projectId?: string; period?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Unified Dashboard</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Unified Dashboard</h1>
        <PermissionDenied requiredPermission="dashboard:read" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canRead = permissions.includes('dashboard:read') || permissions.includes('admin:access');
  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Unified Dashboard</h1>
        <PermissionDenied requiredPermission="dashboard:read" />
      </div>
    );
  }

  const isCeoOrAdmin = session.user.role === 'ceo' || session.user.role === 'admin';
  const activePeriod = searchParams.period || '30d';
  const queryParam = searchParams.projectId
    ? `?projectId=${searchParams.projectId}&period=${activePeriod}`
    : isCeoOrAdmin
      ? `?period=${activePeriod}`
      : searchParams.projectId
        ? `?projectId=${searchParams.projectId}&period=${activePeriod}`
        : `?period=${activePeriod}`;

  const [dashboardRes, projectsRes] = await Promise.all([
    fetchAsCaller(`/api/dashboard${queryParam}`),
    fetchAsCaller('/api/projects'),
  ]);

  if (!dashboardRes.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Unified Dashboard</h1>
        <ErrorState message="Failed to load dashboard aggregations." />
      </div>
    );
  }

  const initialData = await dashboardRes.json();
  const projects = projectsRes.ok ? await projectsRes.json() : [];
  const canExport = permissions.includes('dashboard:export') || permissions.includes('admin:access');
  const isClient = session.user.role === 'client';

  return (
    <DashboardClient
      initialData={initialData}
      projects={projects}
      activeProjectId={searchParams.projectId}
      activePeriod={activePeriod}
      canExport={canExport}
      isClient={isClient}
      userRole={session.user.role}
    />
  );
}
