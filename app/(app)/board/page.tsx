import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../components/data-table/states';
import { BoardClient } from './board-client';

export const metadata: Metadata = { title: 'Kanban Board — Claim Desk' };

interface BoardPageProps {
  searchParams: { projectId?: string };
}

export default async function KanbanBoardPage({ searchParams }: BoardPageProps) {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Engineering Board</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Engineering Board</h1>
        <PermissionDenied requiredPermission="tasks:read" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canRead = permissions.includes('tasks:read') || permissions.includes('admin:access');
  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Engineering Board</h1>
        <PermissionDenied requiredPermission="tasks:read" />
      </div>
    );
  }

  // Fetch available projects
  const projectsRes = await fetchAsCaller('/api/projects');
  const projects = projectsRes.ok ? await projectsRes.json() : [];

  const isPersonalView = searchParams.projectId === 'personal';
  const activeProjectId = isPersonalView ? 'personal' : (searchParams.projectId || (projects.length > 0 ? projects[0].id : null));

  let initialBoard = { backlog: [], todo: [], 'in-progress': [], testing: [], deployed: [] };
  if (isPersonalView) {
    const boardRes = await fetchAsCaller('/api/tasks/personal-board');
    if (boardRes.ok) {
      initialBoard = await boardRes.json();
    }
  } else if (activeProjectId) {
    const boardRes = await fetchAsCaller(`/api/projects/${activeProjectId}/board`);
    if (boardRes.ok) {
      initialBoard = await boardRes.json();
    }
  }

  const usersRes = await fetchAsCaller('/api/users?pageSize=100');
  const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
  const assignees = (usersData.users ?? []).map((u: any) => ({
    id: u.id,
    name: u.fullName || u.username,
  }));

  const canWrite = permissions.includes('tasks:write') || permissions.includes('admin:access');
  const canPrd = permissions.includes('prd:write') || permissions.includes('admin:access');

  return (
    <BoardClient
      projects={projects}
      activeProjectId={activeProjectId}
      initialBoard={initialBoard}
      assignees={assignees}
      currentUserId={session.user.id}
      canWrite={canWrite}
      canPrd={canPrd}
    />
  );
}
