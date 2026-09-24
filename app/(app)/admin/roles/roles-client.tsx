'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import {
  PERMISSION_MODULE_GROUPS,
  PERMISSION_LABELS,
  permissionsForRole,
  type CustomRoleDTO,
  type Permission,
  type Role,
} from '@/shared/index';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Alert } from '../../../../components/ui/alert';

interface StandardRoleItem {
  id: string;
  name: string;
  roleKey: string;
  type: 'standard';
  description: string;
  permissions: string[];
  userCount: number;
}

interface RolesClientProps {
  initialStandard: StandardRoleItem[];
  initialCustom: CustomRoleDTO[];
  canManage: boolean;
}

export function RolesClient({
  initialStandard,
  initialCustom,
  canManage,
}: RolesClientProps) {
  const router = useRouter();

  const [standardRoles] = useState<StandardRoleItem[]>(initialStandard);
  const [customRoles, setCustomRoles] = useState<CustomRoleDTO[]>(initialCustom);
  const [activeTab, setActiveTab] = useState<'custom' | 'standard'>('custom');

  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [baseTemplate, setBaseTemplate] = useState<string>('blank');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setBaseTemplate('blank');
    setSelectedPermissions(new Set());
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: CustomRoleDTO) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setBaseTemplate(role.baseRole || 'blank');
    setSelectedPermissions(new Set(role.permissions));
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleTemplateChange = (template: string) => {
    setBaseTemplate(template);
    if (template === 'blank') {
      setSelectedPermissions(new Set());
    } else {
      const templatePerms = permissionsForRole(template as Role);
      setSelectedPermissions(new Set(templatePerms));
    }
  };

  const togglePermission = (permission: Permission) => {
    const next = new Set(selectedPermissions);
    if (next.has(permission)) {
      next.delete(permission);
    } else {
      next.add(permission);
    }
    setSelectedPermissions(next);
  };

  const toggleModuleAll = (modulePermissions: readonly Permission[]) => {
    const allSelected = modulePermissions.every((p) => selectedPermissions.has(p));
    const next = new Set(selectedPermissions);
    if (allSelected) {
      for (const p of modulePermissions) {
        next.delete(p);
      }
    } else {
      for (const p of modulePermissions) {
        next.add(p);
      }
    }
    setSelectedPermissions(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!roleName.trim()) {
      setErrorMsg('Enter a role name.');
      return;
    }
    if (selectedPermissions.size === 0) {
      setErrorMsg('Select at least one permission for this role.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRoleId) {
        // Update
        const res = await fetch(`/api/roles/${editingRoleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim(),
            permissions: Array.from(selectedPermissions),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to update custom role');
        }

        setCustomRoles((prev) =>
          prev.map((r) => (r.id === editingRoleId ? { ...r, ...data } : r)),
        );
        setSuccessMsg(`Role '${roleName}' updated successfully.`);
      } else {
        // Create
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim(),
            baseRole: baseTemplate === 'blank' ? null : baseTemplate,
            permissions: Array.from(selectedPermissions),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to create custom role');
        }

        setCustomRoles((prev) => [data, ...prev]);
        setSuccessMsg(`Custom role '${roleName}' created successfully.`);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: CustomRoleDTO) => {
    if (
      !confirm(
        `Are you sure you want to delete the role '${role.name}'? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(role.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete role');
      }

      setCustomRoles((prev) => prev.filter((r) => r.id !== role.id));
      setSuccessMsg(`Role '${role.name}' deleted successfully.`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">
            Roles & Fine-Grained Permissions
          </h1>
          <p className="text-sm text-muted mt-1">
            Build custom roles with tailored module permissions or inspect standard system roles.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={openCreateModal}>
            + Create Custom Role
          </Button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg ? (
        <Alert tone="error" title="Failed">
          {errorMsg}
        </Alert>
      ) : null}
      {successMsg ? (
        <Alert tone="success" title="Success">
          {successMsg}
        </Alert>
      ) : null}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'custom'
              ? 'border-accent text-fg'
              : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          Custom Roles ({customRoles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('standard')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'standard'
              ? 'border-accent text-fg'
              : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          Standard System Roles ({standardRoles.length})
        </button>
      </div>

      {/* Tab: Custom Roles */}
      {activeTab === 'custom' && (
        <div className="flex flex-col gap-4">
          {customRoles.length === 0 ? (
            <div className="p-8 text-center bg-panel border border-line rounded-lg flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-well flex items-center justify-center text-muted font-bold text-lg">
                <Users className="size-5" />
              </div>
              <h3 className="font-semibold text-fg">No custom roles defined yet</h3>
              <p className="text-sm text-muted max-w-md">
                Custom roles allow you to tailor specific permission combinations (e.g. QA Tester,
                Support Tier 1, Billing Auditor) and assign them to users directly from the portal.
              </p>
              {canManage && (
                <Button variant="primary" size="sm" onClick={openCreateModal}>
                  Create First Custom Role
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customRoles.map((role) => (
                <div
                  key={role.id}
                  className="bg-panel border border-line rounded-lg p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-line-strong transition-all"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-fg">{role.name}</h3>
                        <span className="inline-block mt-0.5 font-mono text-xs px-2 py-0.5 bg-well text-muted rounded">
                          slug: {role.slug}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-accent/15 text-accent font-medium">
                        {role.userCount ?? 0} active user(s)
                      </span>
                    </div>

                    {role.description && (
                      <p className="text-sm text-muted line-clamp-2 mt-1">{role.description}</p>
                    )}

                    {role.baseRole && (
                      <div className="text-xs text-muted flex items-center gap-1.5 mt-1">
                        <span>Base Template:</span>
                        <span className="font-medium text-fg uppercase tracking-wider">
                          {role.baseRole}
                        </span>
                      </div>
                    )}

                    <div className="mt-2">
                      <div className="text-xs font-medium text-muted mb-1.5">
                        Granted Capabilities ({role.permissions.length}):
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {role.permissions.slice(0, 8).map((perm) => (
                          <span
                            key={perm}
                            className="text-[11px] px-2 py-0.5 bg-well text-fg/85 rounded border border-line"
                            title={PERMISSION_LABELS[perm]}
                          >
                            {perm}
                          </span>
                        ))}
                        {role.permissions.length > 8 && (
                          <span className="text-[11px] px-2 py-0.5 bg-well text-muted rounded">
                            +{role.permissions.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditModal(role)}
                      >
                        Edit Permissions
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={deletingId === role.id}
                        onClick={() => handleDeleteRole(role)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Standard Roles */}
      {activeTab === 'standard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standardRoles.map((role) => (
            <div
              key={role.id}
              className="bg-panel border border-line rounded-lg p-5 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-fg">{role.name}</h3>
                    <span className="inline-block mt-0.5 font-mono text-xs px-2 py-0.5 bg-well text-muted rounded">
                      role: {role.roleKey}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-well text-fg font-medium">
                    {role.userCount} user(s)
                  </span>
                </div>
                <p className="text-sm text-muted mt-2">{role.description}</p>
                <div className="mt-3">
                  <div className="text-xs font-medium text-muted mb-1.5">
                    Locked Capability Count: {role.permissions.length} permissions
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {role.permissions.slice(0, 6).map((perm) => (
                      <span
                        key={perm}
                        className="text-[11px] px-2 py-0.5 bg-well/60 text-muted rounded"
                      >
                        {perm}
                      </span>
                    ))}
                    {role.permissions.length > 6 && (
                      <span className="text-[11px] px-2 py-0.5 bg-well text-muted rounded">
                        +{role.permissions.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted/80 italic pt-2 border-t border-line">
                System role locked by built-in security ladder.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Custom Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-panel border border-line-strong rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-line">
              <div>
                <h2 className="text-lg font-bold text-fg">
                  {editingRoleId ? 'Edit Custom Role' : 'Create New Custom Role'}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Configure role identifier and assign fine-grained permissions across all modules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-fg text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto flex flex-col gap-5">
                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">
                      Role Name <span className="text-accent">*</span>
                    </label>
                    <Input
                      placeholder="e.g. QA Tester, Support Tier 1"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">
                      Base Template (Optional)
                    </label>
                    <select
                      value={baseTemplate}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full h-control-md px-3 rounded-md bg-well border border-line text-fg text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="blank">Blank (Select from scratch)</option>
                      <option value="developer">Start from Developer</option>
                      <option value="manager">Start from Manager</option>
                      <option value="client">Start from Client</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fg mb-1">Description</label>
                  <Input
                    placeholder="Brief description of who carries this role..."
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                  />
                </div>

                {/* Permissions Matrix */}
                <div className="border-t border-line pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-fg">Module Access Matrix</h4>
                      <p className="text-xs text-muted">
                        Check the explicit actions allowed for this role.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-accent/20 text-accent">
                      {selectedPermissions.size} permission(s) granted
                    </span>
                  </div>

                  <div className="space-y-4">
                    {PERMISSION_MODULE_GROUPS.map((group) => {
                      const allGroupSelected = group.permissions.every((p) =>
                        selectedPermissions.has(p),
                      );

                      return (
                        <div
                          key={group.id}
                          className="border border-line rounded-lg p-3.5 bg-well/40"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-line mb-3">
                            <div>
                              <div className="text-sm font-semibold text-fg">{group.label}</div>
                              <div className="text-xs text-muted">{group.description}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleModuleAll(group.permissions)}
                              className="text-xs text-accent hover:underline font-medium"
                            >
                              {allGroupSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {group.permissions.map((perm) => {
                              const isChecked = selectedPermissions.has(perm);
                              return (
                                <label
                                  key={perm}
                                  className={`flex items-start gap-2.5 p-2 rounded cursor-pointer border transition-colors ${
                                    isChecked
                                      ? 'bg-panel border-accent/40 shadow-xs'
                                      : 'bg-panel/40 border-line hover:bg-panel'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(perm)}
                                    className="mt-0.5 rounded border-line text-accent focus:ring-accent"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-fg">
                                      {PERMISSION_LABELS[perm] || perm}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted">
                                      {perm}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-line bg-well/30">
                <Button
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={isSubmitting}>
                  {editingRoleId ? 'Save Changes' : 'Create Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
