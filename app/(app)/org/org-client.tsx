'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS, type Role } from '@/shared';
import { Button } from '../../../components/ui/button';
import { Select } from '../../../components/ui/select';
import { Alert } from '../../../components/ui/alert';

export interface OrgNode {
  id: string;
  email: string;
  username: string;
  role: Role;
  fullName: string;
  department: string;
  phone: string;
  pictureUrl: string | null;
  managerId: string | null;
  directReports: OrgNode[];
}

export interface OrgChartData {
  tree: OrgNode[];
  unassigned: OrgNode[];
}

interface OrgChartClientProps {
  initialData: OrgChartData;
  allUsers: Array<{ id: string; fullName: string; username: string; role: Role }>;
  canAssignManager: boolean;
}

function TreeNode({
  node,
  canAssignManager,
  onAssignManager,
  onViewUser,
}: {
  node: OrgNode;
  canAssignManager: boolean;
  onAssignManager: (user: OrgNode) => void;
  onViewUser: (user: OrgNode) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasReports = node.directReports && node.directReports.length > 0;

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-3 rounded-surface border border-line bg-panel p-3 shadow-xs hover:border-line-strong transition-colors min-w-[280px]">
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-line bg-well flex items-center justify-center font-bold text-sm text-fg-subtle">
          {node.pictureUrl ? (
            <img src={node.pictureUrl} alt={node.fullName} className="h-full w-full object-cover" />
          ) : (
            (node.fullName || node.username).charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <button
            onClick={() => onViewUser(node)}
            className="text-sm font-semibold text-fg hover:underline truncate block text-left"
          >
            {node.fullName || node.username}
          </button>
          <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <span>{ROLE_LABELS[node.role] ?? node.role}</span>
            {node.department ? <span>· {node.department}</span> : null}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canAssignManager ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAssignManager(node)}
              className="text-xs px-2 h-7"
            >
              Set Lead
            </Button>
          ) : null}

          {hasReports ? (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="h-6 w-6 rounded border border-line flex items-center justify-center text-xs text-fg-muted hover:bg-hover"
            >
              {collapsed ? `+${node.directReports.length}` : '−'}
            </button>
          ) : null}
        </div>
      </div>

      {hasReports && !collapsed ? (
        <div className="ml-6 pl-4 border-l-2 border-line flex flex-col gap-3 pt-2">
          {node.directReports.map((report) => (
            <TreeNode
              key={report.id}
              node={report}
              canAssignManager={canAssignManager}
              onAssignManager={onAssignManager}
              onViewUser={onViewUser}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OrgChartClient({ initialData, allUsers, canAssignManager }: OrgChartClientProps) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<OrgNode | null>(null);
  const [viewingUser, setViewingUser] = useState<OrgNode | null>(null);
  const [chosenManagerId, setChosenManagerId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleOpenAssign = (user: OrgNode) => {
    setSelectedUser(user);
    setChosenManagerId(user.managerId || '');
    setErrorMsg(null);
  };

  const handleSaveManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}/manager`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerId: chosenManagerId ? chosenManagerId : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update manager');
      }

      setSuccessMsg('Reporting line updated successfully.');
      setSelectedUser(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {errorMsg ? (
        <Alert tone="error" title="Reporting Line Error">
          {errorMsg}
        </Alert>
      ) : null}

      {successMsg ? (
        <Alert tone="success" title="Success">
          {successMsg}
        </Alert>
      ) : null}

      {/* Main Hierarchy Trees */}
      <div className="rounded-surface border border-line bg-panel p-6">
        <h2 className="text-base font-semibold text-fg mb-4">Organizational Hierarchy</h2>
        {initialData.tree.length === 0 ? (
          <p className="text-sm text-fg-muted">No active staff found in organization.</p>
        ) : (
          <div className="flex flex-col gap-6 overflow-x-auto pb-4">
            {initialData.tree.map((root) => (
              <TreeNode
                key={root.id}
                node={root}
                canAssignManager={canAssignManager}
                onAssignManager={handleOpenAssign}
                onViewUser={setViewingUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Unassigned or Standalone List */}
      {initialData.unassigned.length > 0 ? (
        <div className="rounded-surface border border-line bg-panel p-6">
          <h2 className="text-base font-semibold text-fg mb-2">Unlinked Members</h2>
          <p className="text-xs text-fg-muted mb-4">
            Members whose manager assignment is missing, deactivated, or disconnected.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {initialData.unassigned.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between border border-line rounded p-3 bg-surface"
              >
                <div>
                  <button
                    onClick={() => setViewingUser(user)}
                    className="text-sm font-medium text-fg hover:underline text-left"
                  >
                    {user.fullName || user.username}
                  </button>
                  <p className="text-xs text-fg-subtle">{ROLE_LABELS[user.role] ?? user.role}</p>
                </div>
                {canAssignManager ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenAssign(user)}
                    className="text-xs"
                  >
                    Assign
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Manager Assignment Modal */}
      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-1">Assign Manager</h3>
            <p className="text-xs text-fg-muted mb-4">
              Set reporting lead for{' '}
              <span className="font-semibold text-fg">
                {selectedUser.fullName || selectedUser.username}
              </span>
            </p>

            <form onSubmit={handleSaveManager} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase-label mb-1">Direct Manager</label>
                <Select
                  value={chosenManagerId}
                  onChange={(e) => setChosenManagerId(e.target.value)}
                >
                  <option value="">None (Top-Level / Independent)</option>
                  {allUsers
                    .filter((u) => u.id !== selectedUser.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.username} ({ROLE_LABELS[u.role] ?? u.role})
                      </option>
                    ))}
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedUser(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Reporting Line'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {/* Profile Modal */}
      {viewingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-fg">User Profile</h3>
              <button onClick={() => setViewingUser(null)} className="text-fg-muted hover:text-fg">
                ✕
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-line bg-well flex items-center justify-center font-bold text-xl text-fg-subtle">
                {viewingUser.pictureUrl ? (
                  <img src={viewingUser.pictureUrl} alt={viewingUser.fullName} className="h-full w-full object-cover" />
                ) : (
                  (viewingUser.fullName || viewingUser.username).charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-fg">{viewingUser.fullName || viewingUser.username}</p>
                <p className="text-sm text-fg-subtle">{ROLE_LABELS[viewingUser.role] ?? viewingUser.role}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-fg-subtle">Username</span>
                <span className="font-medium">{viewingUser.username}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-fg-subtle">Email</span>
                <span className="font-medium">{viewingUser.email}</span>
              </div>
              {viewingUser.department && (
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-fg-subtle">Department</span>
                  <span className="font-medium">{viewingUser.department}</span>
                </div>
              )}
              {viewingUser.phone && (
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-fg-subtle">Phone</span>
                  <span className="font-medium">{viewingUser.phone}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="primary" onClick={() => setViewingUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
