'use client';

import React, { useState } from 'react';
import { EventTimeline, type TimelineEventItem } from '../../../components/event-timeline';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Alert } from '../../../components/ui/alert';
import { EVENT_TYPES, type EventType } from '@/shared/index';

export interface EventsClientProps {
  initialEvents: TimelineEventItem[];
  projects: Array<{ id: string; name: string }>;
  canManage: boolean;
}

export function EventsClient({ initialEvents, projects, canManage }: EventsClientProps) {
  const [events, setEvents] = useState<TimelineEventItem[]>(initialEvents);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [newType, setNewType] = useState<EventType>('certificate');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newRole, setNewRole] = useState('developer');
  const [certDomain, setCertDomain] = useState('');
  const [contractParties, setContractParties] = useState('');
  const [maintWindow, setMaintWindow] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Renew state
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [renewDate, setRenewDate] = useState('');
  const [isRenewing, setIsRenewing] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newTitle || !newDate) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        projectId: selectedProjectId,
        type: newType,
        title: newTitle,
        description: newDescription,
        date: new Date(newDate).toISOString(),
        responsibleRole: newRole,
      };

      if (newType === 'certificate') {
        payload.certificateDetails = { domain: certDomain, issuer: 'Let\'s Encrypt' };
      } else if (newType === 'contract') {
        payload.contractDetails = { parties: contractParties };
      } else if (newType === 'maintenance') {
        payload.maintenanceDetails = { window: maintWindow };
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create event');
      }

      const created = await res.json();
      setEvents((prev) => [...prev, created]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewDate('');
      setCertDomain('');
      setContractParties('');
      setMaintWindow('');
      setSuccessMsg('Event obligation created successfully.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingId || !renewDate) return;
    setIsRenewing(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/events/${renewingId}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDate: new Date(renewDate).toISOString() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to renew event');
      }

      const renewed = await res.json();
      setEvents((prev) => [
        ...prev.map((ev) => (ev.id === renewingId ? { ...ev, status: 'completed' as const } : ev)),
        renewed,
      ]);
      setRenewingId(null);
      setRenewDate('');
      setSuccessMsg('Event obligation renewed successfully.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsRenewing(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (projectFilter !== 'all' && e.projectId !== projectFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {errorMsg && <Alert tone="error" title="Error">{errorMsg}</Alert>}
      {successMsg && <Alert tone="success" title="Success">{successMsg}</Alert>}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-fg">Events, Renewals & Dated Obligations</h1>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} className="text-xs">
            + Add Event
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-surface border border-line bg-panel">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase-label font-bold">Type:</span>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs h-8">
            <option value="all">All Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        {projects.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase-label font-bold">Project:</span>
            <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="text-xs h-8">
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Timeline View */}
      <div className="p-5 rounded-surface border border-line bg-panel">
        <EventTimeline
          events={filteredEvents}
          canManage={canManage}
          onRenew={(id) => setRenewingId(id)}
        />
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-surface p-6 max-w-lg w-full flex flex-col gap-4">
            <h2 className="text-base font-semibold text-fg">Schedule Dated Obligation / Event</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="text-xs uppercase-label font-bold block mb-1">Project</label>
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase-label font-bold block mb-1">Event Type</label>
                  <Select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as EventType)}
                    className="text-xs"
                  >
                    <option value="certificate">SSL/TLS Certificate</option>
                    <option value="contract">Client Contract</option>
                    <option value="maintenance">Maintenance Window</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase-label font-bold block mb-1">Due / Expiry Date</label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase-label font-bold block mb-1">Title</label>
                <Input
                  placeholder="e.g. Wildcard Certificate Expiry (*.domain.com)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              {newType === 'certificate' && (
                <div>
                  <label className="text-xs uppercase-label font-bold block mb-1">Domain</label>
                  <Input
                    placeholder="api.domain.com"
                    value={certDomain}
                    onChange={(e) => setCertDomain(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}

              {newType === 'contract' && (
                <div>
                  <label className="text-xs uppercase-label font-bold block mb-1">Parties</label>
                  <Input
                    placeholder="e.g. Acme Corp & Studio"
                    value={contractParties}
                    onChange={(e) => setContractParties(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}

              {newType === 'maintenance' && (
                <div>
                  <label className="text-xs uppercase-label font-bold block mb-1">Window details</label>
                  <Input
                    placeholder="e.g. Sunday 02:00 - 04:00 UTC"
                    value={maintWindow}
                    onChange={(e) => setMaintWindow(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-xs uppercase-label font-bold block mb-1">Responsible Role</label>
                <Select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="text-xs">
                  <option value="developer">Developer</option>
                  <option value="manager">Manager</option>
                  <option value="management">Management</option>
                </Select>
              </div>

              <div>
                <label className="text-xs uppercase-label font-bold block mb-1">Description (Optional)</label>
                <Input
                  placeholder="Additional notes"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Event'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {renewingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-surface p-6 max-w-sm w-full flex flex-col gap-4">
            <h2 className="text-base font-semibold text-fg">Renew Obligation</h2>
            <form onSubmit={handleRenewSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs uppercase-label font-bold block mb-1">Next Renewal / Expiry Date</label>
                <Input
                  type="date"
                  value={renewDate}
                  onChange={(e) => setRenewDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <Button variant="secondary" size="sm" type="button" onClick={() => setRenewingId(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isRenewing}>
                  {isRenewing ? 'Renewing...' : 'Confirm Renewal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
