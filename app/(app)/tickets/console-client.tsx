'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge, PriorityBadge } from '../../../components/badges';
import { Button } from '../../../components/ui/button';
import { Select } from '../../../components/ui/select';
import { Alert } from '../../../components/ui/alert';
import { type Priority } from '@/shared/index';

export interface ConsoleTicketItem {
  id: string;
  reference: string;
  projectName: string;
  clientName: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  assigneeId: string | null;
  assigneeName: string | null;
  requesterName: string;
  lastActivityAt: string;
}

export interface QueueCounts {
  all: number;
  unclaimed: number;
  my_tickets: number;
  urgent: number;
}

interface ConsoleClientProps {
  initialTickets: ConsoleTicketItem[];
  counts: QueueCounts;
  currentQueue: string;
  staffMembers: Array<{ id: string; name: string }>;
  canAssign: boolean;
}

export function ConsoleClient({
  initialTickets,
  counts,
  currentQueue,
  staffMembers,
  canAssign,
}: ConsoleClientProps) {
  const router = useRouter();

  const [selectedTicket, setSelectedTicket] = useState<ConsoleTicketItem | null>(initialTickets[0] ?? null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action states
  const [isClaiming, setIsClaiming] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateTier, setEscalateTier] = useState('Tier 2 Support');
  const [isEscalating, setIsEscalating] = useState(false);

  // Bulk actions state
  const [bulkAction, setBulkAction] = useState<'assign' | 'set_priority' | 'close'>('assign');
  const [bulkAssignee, setBulkAssignee] = useState(staffMembers[0]?.id || '');
  const [bulkPriority, setBulkPriority] = useState<Priority>('P1');
  const [isBulkActing, setIsBulkActing] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleClaim = async () => {
    if (!selectedTicket) return;
    setIsClaiming(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/claim`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to claim ticket');
      }
      const updated = await res.json();
      setSelectedTicket((prev) => (prev ? { ...prev, ...updated } : null));
      setSuccessMsg(`Ticket ${selectedTicket.reference} claimed successfully.`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !resolutionNote.trim()) return;
    setIsResolving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to resolve ticket');
      }
      setShowResolveModal(false);
      setResolutionNote('');
      setSuccessMsg(`Ticket ${selectedTicket.reference} marked resolved.`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsResolving(false);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !escalateReason.trim()) return;
    setIsEscalating(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: escalateReason, tier: escalateTier }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to escalate ticket');
      }
      setShowEscalateModal(false);
      setEscalateReason('');
      setSuccessMsg(`Ticket ${selectedTicket.reference} escalated to ${escalateTier}.`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsEscalating(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkActing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: Array.from(selectedIds),
          action: bulkAction,
          assigneeId: bulkAction === 'assign' ? bulkAssignee : undefined,
          priority: bulkAction === 'set_priority' ? bulkPriority : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Bulk action failed');
      }

      const result = await res.json();
      setSuccessMsg(`Bulk action processed ${result.updated} tickets.`);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsBulkActing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {errorMsg ? <Alert tone="error" title="Notice">{errorMsg}</Alert> : null}
      {successMsg ? <Alert tone="success" title="Success">{successMsg}</Alert> : null}

      {/* Main 3-Pane Console */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: Queue Rail (2 cols) */}
        <div className="md:col-span-2 rounded-surface border border-line bg-panel p-3 flex flex-col gap-1 overflow-y-auto">
          <p className="text-xs uppercase-label px-2 py-1 font-bold">Queues</p>
          {[
            { id: 'all', label: 'All Open', count: counts.all },
            { id: 'unclaimed', label: 'Unclaimed', count: counts.unclaimed },
            { id: 'my_tickets', label: 'Assigned to Me', count: counts.my_tickets },
            { id: 'urgent', label: 'Urgent P1', count: counts.urgent },
          ].map((q) => (
            <Link
              key={q.id}
              href={`/tickets?queue=${q.id}`}
              className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium ${
                currentQueue === q.id ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30' : 'text-fg-muted hover:bg-hover'
              }`}
            >
              <span>{q.label}</span>
              <span className="font-mono text-xs text-fg-subtle">{q.count}</span>
            </Link>
          ))}
        </div>

        {/* Middle: Ticket List (5 cols) */}
        <div className="md:col-span-5 rounded-surface border border-line bg-panel flex flex-col min-h-0 overflow-hidden">
          {/* Bulk Bar */}
          {selectedIds.size > 0 && canAssign ? (
            <div className="p-2 border-b border-line bg-well flex items-center justify-between gap-2 text-xs">
              <span className="text-fg-muted">{selectedIds.size} selected</span>
              <div className="flex items-center gap-1.5">
                <Select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as any)} className="text-xs h-7">
                  <option value="assign">Assign</option>
                  <option value="set_priority">Priority</option>
                  <option value="close">Close</option>
                </Select>
                {bulkAction === 'assign' ? (
                  <Select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} className="text-xs h-7">
                    {staffMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </Select>
                ) : null}
                {bulkAction === 'set_priority' ? (
                  <Select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value as Priority)} className="text-xs h-7">
                    <option value="P1">P1 - Critical</option>
                    <option value="P2">P2 - High</option>
                    <option value="P3">P3 - Medium</option>
                    <option value="P4">P4 - Low</option>
                  </Select>
                ) : null}
                <Button variant="secondary" size="sm" onClick={handleBulkSubmit} disabled={isBulkActing} className="h-7 text-xs">
                  Apply
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-y-auto flex-1 divide-y divide-line">
            {initialTickets.length === 0 ? (
              <p className="p-6 text-center text-xs text-fg-subtle">No tickets found in this queue.</p>
            ) : (
              initialTickets.map((t) => {
                const isCurrent = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3 cursor-pointer hover:bg-hover flex items-start gap-2.5 transition-colors ${
                      isCurrent ? 'bg-well border-l-2 border-indigo-500' : ''
                    }`}
                  >
                    {canAssign ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 rounded border-line"
                      />
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-fg truncate">{t.reference}</span>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="text-sm font-medium text-fg truncate mt-0.5">{t.title}</p>
                      <div className="flex items-center justify-between text-xs text-fg-subtle mt-1">
                        <span>{t.clientName}</span>
                        <span>{t.assigneeName ? `@${t.assigneeName}` : 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Ticket Detail & Operations (5 cols) */}
        <div className="md:col-span-5 rounded-surface border border-line bg-panel p-5 flex flex-col justify-between overflow-y-auto min-h-0">
          {selectedTicket ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-mono text-sm font-bold text-fg">{selectedTicket.reference}</span>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={selectedTicket.priority} />
                  <StatusBadge status={selectedTicket.status} />
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-fg">{selectedTicket.title}</h2>
                <p className="text-xs text-fg-subtle font-mono mt-0.5">
                  Project: {selectedTicket.projectName} · Requester: {selectedTicket.requesterName}
                </p>
                <div className="mt-3 text-xs text-fg-muted whitespace-pre-wrap bg-surface p-3 rounded border border-line">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                {!selectedTicket.assigneeId && selectedTicket.status === 'new' ? (
                  <Button variant="primary" size="sm" onClick={handleClaim} disabled={isClaiming}>
                    {isClaiming ? 'Claiming...' : 'Claim Ticket'}
                  </Button>
                ) : null}

                {selectedTicket.status === 'in-progress' ? (
                  <Button variant="secondary" size="sm" onClick={() => setShowResolveModal(true)}>
                    Resolve Ticket
                  </Button>
                ) : null}

                {selectedTicket.status !== 'closed' ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowEscalateModal(true)}>
                    Escalate
                  </Button>
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSuccessMsg('Coming soon: Direct task creation from tickets will be available soon.');
                  }}
                  className="opacity-70 hover:opacity-100"
                  title="Coming soon"
                >
                  Create Task
                </Button>

                <Link href={`/portal/${selectedTicket.reference}`}>
                  <Button variant="ghost" size="sm">Full Thread ↗</Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-fg-subtle my-auto">Select a ticket to inspect.</p>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-1">Resolve Ticket</h3>
            <p className="text-xs text-fg-muted mb-4">A documented resolution note is mandatory (R031).</p>
            <form onSubmit={handleResolve} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase-label mb-1">Resolution Explanation</label>
                <textarea
                  required
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explain the fix, deployment, or response provided..."
                  className="w-full rounded border border-line bg-surface p-2.5 text-sm text-fg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowResolveModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isResolving}>
                  {isResolving ? 'Resolving...' : 'Confirm Resolution'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Escalate Modal */}
      {showEscalateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-1">Escalate Ticket</h3>
            <p className="text-xs text-fg-muted mb-4">Escalate to higher tier or leadership (R035).</p>
            <form onSubmit={handleEscalate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase-label mb-1">Target Tier</label>
                <Select value={escalateTier} onChange={(e) => setEscalateTier(e.target.value)}>
                  <option value="Tier 2 Support">Tier 2 Support</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Leadership">Leadership</option>
                  <option value="CTO Office">CTO Office</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs uppercase-label mb-1">Reason for Escalation</label>
                <textarea
                  required
                  rows={3}
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Why is immediate escalation required?"
                  className="w-full rounded border border-line bg-surface p-2.5 text-sm text-fg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowEscalateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isEscalating}>
                  {isEscalating ? 'Escalating...' : 'Confirm Escalation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
