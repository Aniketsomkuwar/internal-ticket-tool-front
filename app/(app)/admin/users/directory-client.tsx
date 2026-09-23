'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, ROLE_LABELS, type Role, type CustomRoleDTO } from '@/shared';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Alert } from '../../../../components/ui/alert';

export interface UserRow {
  id: string;
  email: string;
  username: string;
  role: string;
  customRoleId?: string | null;
  active: boolean;
  fullName: string;
  department: string;
  phone: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface DirectoryClientProps {
  initialUsers: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  canWrite: boolean;
  canAssignRole: boolean;
}

export function DirectoryClient({
  initialUsers,
  total,
  page,
  pageSize,
  canWrite,
  canAssignRole,
}: DirectoryClientProps) {
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [customRoles, setCustomRoles] = useState<CustomRoleDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<string>('developer');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New user form state
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>('developer');
  const [newDept, setNewDept] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetch('/api/roles')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.custom)) {
          setCustomRoles(data.custom);
        }
      })
      .catch(() => {});
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBulkUpdating(true);

    try {
      let rolePayload = bulkRole;
      let customRoleIdPayload: string | undefined = undefined;

      if (bulkRole.startsWith('custom:')) {
        customRoleIdPayload = bulkRole.replace('custom:', '');
        const found = customRoles.find((cr) => cr.id === customRoleIdPayload);
        rolePayload = found ? found.slug : customRoleIdPayload;
      }

      const res = await fetch('/api/users/bulk-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          role: rolePayload,
          customRoleId: customRoleIdPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Bulk assignment failed');
      }

      const roleDisplay = ROLE_LABELS[bulkRole as Role] || bulkRole;
      setSuccessMsg(`Successfully reassigned role for ${selectedIds.size} users to ${roleDisplay}.`);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleToggleActive = async (user: UserRow) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update user status');
      }

      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsCreating(true);

    try {
      let rolePayload = newRole;
      let customRoleIdPayload: string | undefined = undefined;

      if (newRole.startsWith('custom:')) {
        customRoleIdPayload = newRole.replace('custom:', '');
        const found = customRoles.find((cr) => cr.id === customRoleIdPayload);
        rolePayload = found ? found.slug : customRoleIdPayload;
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          username: newUsername,
          password: newPassword,
          fullName: newName,
          role: rolePayload,
          customRoleId: customRoleIdPayload,
          department: newDept,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create user');
      }

      const created = await res.json();
      setUsers((prev) => [...prev, created]);
      setShowCreateModal(false);
      setNewEmail('');
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewRole('developer');
      setNewDept('');
      setSuccessMsg('User successfully created with assigned role.');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {errorMsg ? (
        <Alert tone="error" title="Action failed">
          {errorMsg}
        </Alert>
      ) : null}

      {successMsg ? (
        <Alert tone="success" title="Completed">
          {successMsg}
        </Alert>
      ) : null}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          {canAssignRole && selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-muted">{selectedIds.size} selected</span>
              <Select
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value)}
                className="w-48 text-xs"
              >
                <optgroup label="Standard Roles">
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </optgroup>
                {customRoles.length > 0 && (
                  <optgroup label="Custom Roles">
                    {customRoles.map((cr) => (
                      <option key={cr.id} value={`custom:${cr.id}`}>
                        {cr.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkAssign}
                disabled={isBulkUpdating}
              >
                {isBulkUpdating ? 'Updating...' : `Assign to ${selectedIds.size}`}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-fg-subtle">
              Total {total} user{total === 1 ? '' : 's'} registered (Page {page} of {Math.max(1, Math.ceil(total / pageSize))})
            </p>
          )}
        </div>

        {canWrite ? (
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            + Add Person
          </Button>
        ) : null}
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto rounded border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-well text-xs uppercase text-fg-subtle">
            <tr>
              {canAssignRole ? (
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedIds.size === users.length}
                    onChange={toggleSelectAll}
                    className="rounded border-line"
                  />
                </th>
              ) : null}
              <th className="px-4 py-3">Name / Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              {canWrite ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => {
              const isSelected = selectedIds.has(u.id);
              const customMatch = customRoles.find(
                (cr) => cr.slug === u.role || (u.customRoleId && cr.id === u.customRoleId),
              );
              return (
                <tr
                  key={u.id}
                  className={`hover:bg-hover ${isSelected ? 'bg-well' : ''}`}
                >
                  {canAssignRole ? (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(u.id)}
                        className="rounded border-line"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-medium text-fg">
                    <div>{u.fullName || u.username}</div>
                    <div className="text-xs text-fg-subtle">@{u.username}</div>
                  </td>
                  <td className="px-4 py-3 text-fg-muted font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    {ROLE_LABELS[u.role as Role] ? (
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border border-line">
                        {ROLE_LABELS[u.role as Role]}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
                        {customMatch ? customMatch.name : u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-muted text-xs">
                    {u.department || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block h-2 w-2 rounded-full mr-1.5 ${
                        u.active ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-xs text-fg-muted">
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  {canWrite ? (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(u)}
                        className="text-xs"
                      >
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-fg mb-4">Add New Person</h2>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs uppercase-label mb-1">Full Name</label>
                <Input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Email Address</label>
                <Input
                  required
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jane.doe@company.com"
                />
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Username</label>
                <Input
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="janedoe"
                />
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Password</label>
                <Input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Role & Permissions</label>
                <Select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <optgroup label="Standard Built-in Roles">
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </optgroup>
                  {customRoles.length > 0 && (
                    <optgroup label="Custom Roles">
                      {customRoles.map((cr) => (
                        <option key={cr.id} value={`custom:${cr.id}`}>
                          {cr.name} ({cr.permissions.length} perms)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Department</label>
                <Input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="e.g. Engineering, Support"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Person'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
