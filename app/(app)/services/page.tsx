import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../components/data-table/states';
import { ServicesClient } from './services-client';

export const metadata: Metadata = { title: 'Service Health & Incidents — Claim Desk' };

interface ServicesPageProps {
  searchParams: { projectId?: string };
}

export default async function ServicesHealthPage({ searchParams }: ServicesPageProps) {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Service Health</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Service Health</h1>
        <PermissionDenied requiredPermission="services:read" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canRead = permissions.includes('services:read') || permissions.includes('admin:access');
  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Service Health</h1>
        <PermissionDenied requiredPermission="services:read" />
      </div>
    );
  }

  const [servicesRes, incidentsRes, projectsRes] = await Promise.all([
    fetchAsCaller(searchParams.projectId ? `/api/services?projectId=${searchParams.projectId}` : '/api/services'),
    fetchAsCaller(searchParams.projectId ? `/api/incidents?projectId=${searchParams.projectId}` : '/api/incidents'),
    fetchAsCaller('/api/projects'),
  ]);

  if (!servicesRes.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Service Health</h1>
        <ErrorState message="Failed to load service monitoring data." />
      </div>
    );
  }

  const services = await servicesRes.json();
  const incidents = incidentsRes.ok ? await incidentsRes.json() : [];
  const projects = projectsRes.ok ? await projectsRes.json() : [];

  const canWrite = permissions.includes('services:write') || permissions.includes('admin:access');

  return (
    <ServicesClient
      initialServices={services}
      initialIncidents={incidents}
      projects={projects}
      activeProjectId={searchParams.projectId}
      canWrite={canWrite}
    />
  );
}
