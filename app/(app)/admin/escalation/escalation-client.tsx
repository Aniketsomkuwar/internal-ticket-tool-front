'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { Select } from '../../../../components/ui/select';
import { Input } from '../../../../components/ui/input';
import { Alert } from '../../../../components/ui/alert';
import { ROLES, ROLE_LABELS, type Role } from '@/shared/index';

export interface EscalationRuleItem {
  _id: string;
  fromRole: Role;
  toRole: Role;
  triggerHours: number;
  p1TriggerHours: number;
  isActive: boolean;
}

export function EscalationClient({ initialRules }: { initialRules: EscalationRuleItem[] }) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [showAddModal, setShowAddModal] = useState(false);
  const [fromRole, setFromRole] = useState<Role>('developer');
  const [toRole, setToRole] = useState<Role>('manager');
  const [triggerHours, setTriggerHours] = useState(24);
  const [p1TriggerHours, setP1TriggerHours] = useState(4);

  const [isRunningPass, setIsRunningPass] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const res = await fetch('/api/escalation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromRole,
          toRole,
          triggerHours: Number(triggerHours),
          p1TriggerHours: Number(p1TriggerHours),
          isActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create rule');
      }

      const created = await res.json();
      setRules((prev) => [...prev, created]);
      setShowAddModal(false);
      setSuccessMsg('Escalation rule saved.');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleTriggerPass = async () => {
    setIsRunningPass(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/escalation/run', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run escalation pass');
      const data = await res.json();
      setSuccessMsg(`Escalation sweep finished: Evaluated ${data.evaluated} tickets, escalated ${data.escalated}.`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsRunningPass(false);
    }
  };

  const handleExportAudit = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const url = `/api/audit/export?format=${format}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to export audit log');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {errorMsg ? <Alert tone="error" title="Notice">{errorMsg}</Alert> : null}
      {successMsg ? <Alert tone="success" title="Success">{successMsg}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Escalation Automation & Audit</h1>
          <p className="text-xs text-fg-muted">Manage idle ticket escalation ladders and export immutable audit records.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExportAudit('csv')} disabled={isExporting}>
            Export Audit (CSV)
          </Button>
          <Button variant="secondary" size="sm" onClick={handleTriggerPass} disabled={isRunningPass}>
            {isRunningPass ? 'Sweeping...' : 'Run Escalation Pass'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            + Add Rule
          </Button>
        </div>
      </div>

      <div className="rounded-surface border border-line bg-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-well text-xs uppercase text-fg-subtle">
            <tr>
              <th className="px-4 py-3">From Role</th>
              <th className="px-4 py-3">Escalates To</th>
              <th className="px-4 py-3">Standard Idle Threshold</th>
              <th className="px-4 py-3">P1 Urgent Threshold</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rules.map((r) => (
              <tr key={r._id} className="hover:bg-hover">
                <td className="px-4 py-3 font-semibold text-fg">{ROLE_LABELS[r.fromRole] ?? r.fromRole}</td>
                <td className="px-4 py-3 font-semibold text-indigo-400">→ {ROLE_LABELS[r.toRole] ?? r.toRole}</td>
                <td className="px-4 py-3 font-mono text-xs text-fg-muted">{r.triggerHours} hours</td>
                <td className="px-4 py-3 font-mono text-xs text-rose-400 font-bold">{r.p1TriggerHours} hours</td>
                <td className="px-4 py-3 text-xs">
                  <span className="inline-block h-2 w-2 rounded-full mr-1.5 bg-emerald-500" />
                  Active
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Rule Modal */}
      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-4">Add Escalation Rule</h3>
            <form onSubmit={handleCreateRule} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs uppercase-label mb-1">From Current Assignee Role</label>
                <Select value={fromRole} onChange={(e) => setFromRole(e.target.value as Role)}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Escalate Upward To Role</label>
                <Select value={toRole} onChange={(e) => setToRole(e.target.value as Role)}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase-label mb-1">Standard Idle (Hours)</label>
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    value={triggerHours}
                    onChange={(e) => setTriggerHours(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase-label mb-1">P1 Urgent (Hours)</label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={p1TriggerHours}
                    onChange={(e) => setP1TriggerHours(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Rule</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
