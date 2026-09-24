import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../../components/data-table/states';
import { RolesClient } from './roles-client';
import type { CustomRoleDTO } from '@/shared/index';

export const metadata: Metadata = { title: 'Roles & Fine-Grained Permissions — Claim Desk' };

interface RolesResponse {
  standard: Array<{
    id: string;
    name: string;
    roleKey: string;
    type: 'standard';
    description: string;
    permissions: string[];
    userCount: number;
  }>;
  custom: CustomRoleDTO[];
}

export default async function RolesAdminPage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Roles & Permissions</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Roles & Permissions</h1>
        <PermissionDenied requiredPermission="role:assign" />
      </div>
    );
  }

  const permissions = session.permissions;
  const canAccess =
    permissions.includes('role:assign') ||
    permissions.includes('admin:access') ||
    permissions.includes('user:read');

  if (!canAccess) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Roles & Permissions</h1>
        <PermissionDenied requiredPermission="role:assign" />
      </div>
    );
  }

  const canManage = permissions.includes('role:assign') || permissions.includes('admin:access');

  const res = await fetchAsCaller<RolesResponse>('/api/roles');
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Roles & Permissions</h1>
        <ErrorState message="Failed to load roles and permission matrix." />
      </div>
    );
  }

  return (
    <RolesClient
      initialStandard={res.data.standard}
      initialCustom={res.data.custom}
      canManage={canManage}
    />
  );
}
