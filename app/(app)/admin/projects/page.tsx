import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../../components/data-table/states';
import { ProjectsClient, type ProjectItem } from './projects-client';

export const metadata: Metadata = { title: 'Projects — Claim Desk' };

export default async function AdminProjectsPage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Projects</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Projects</h1>
        <PermissionDenied requiredPermission="projects:write" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canWrite = permissions.includes('projects:write') || permissions.includes('admin:access');
  if (!canWrite) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Projects</h1>
        <PermissionDenied requiredPermission="projects:write" />
      </div>
    );
  }

  const res = await fetchAsCaller<ProjectItem[]>('/api/projects');
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Projects</h1>
        <ErrorState message="Failed to load projects list." />
      </div>
    );
  }

  const projects: ProjectItem[] = res.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Project Management</h1>
        <p className="text-xs text-fg-muted">
          Client isolation boundaries and project credentials handover.
        </p>
      </div>

      <ProjectsClient initialProjects={projects} />
    </div>
  );
}
