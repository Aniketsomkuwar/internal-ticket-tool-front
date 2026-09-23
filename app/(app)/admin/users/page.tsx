import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../../components/data-table/states';
import { DirectoryClient, type UserRow } from './directory-client';

export const metadata: Metadata = { title: 'User Directory — Claim Desk' };

interface UserQueryResult {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default async function UsersDirectoryPage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">User Directory</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status !== 'authenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">User Directory</h1>
        <PermissionDenied requiredPermission="user:read" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canRead = permissions.includes('user:read') || permissions.includes('admin:access');
  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">User Directory</h1>
        <PermissionDenied requiredPermission="user:read" />
      </div>
    );
  }

  const canWrite = permissions.includes('user:write') || permissions.includes('admin:access');
  const canAssignRole = permissions.includes('role:assign') || permissions.includes('admin:access');

  const res = await fetchAsCaller('/api/users?pageSize=100');
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">User Directory</h1>
        <ErrorState message="Failed to load user directory." />
      </div>
    );
  }

  const data: UserQueryResult = await res.json();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">User Directory</h1>
        <p className="text-xs text-fg-muted">
          Manage users, assign single roles, and deactivate accounts.
        </p>
      </div>

      <DirectoryClient
        initialUsers={data.users}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        canWrite={canWrite}
        canAssignRole={canAssignRole}
      />
    </div>
  );
}
