'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Alert } from '../../../components/ui/alert';

interface ServiceItem {
  id: string;
  projectId: string;
  name: string;
  url: string;
  cadenceMinutes: number;
  lastStatus: 'up' | 'degraded' | 'down' | 'unknown';
  lastResponseMs?: number;
  lastCheckedAt?: string;
  uptime24h?: number;
}

interface IncidentItem {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  openedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  isAutomated: boolean;
  timeline: Array<{ timestamp: string; message: string; actor?: string }>;
}

interface ServicesClientProps {
  initialServices: ServiceItem[];
  initialIncidents: IncidentItem[];
  projects: Array<{ id: string; name: string }>;
  activeProjectId?: string;
  canWrite: boolean;
}

export function ServicesClient({
  initialServices,
  initialIncidents,
  projects,
  activeProjectId,
  canWrite,
}: ServicesClientProps) {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [incidents, setIncidents] = useState<IncidentItem[]>(initialIncidents);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual Check
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // New Service Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceUrl, setServiceUrl] = useState('');
  const [cadence, setCadence] = useState<'1' | '5' | '15' | '30'>('5');
  const [targetProject, setTargetProject] = useState(activeProjectId || (projects[0]?.id ?? ''));
  const [isAdding, setIsAdding] = useState(false);

  // Resolve Incident Modal
  const [resolveIncidentId, setResolveIncidentId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const handleManualCheck = async (serviceId: string) => {
    setCheckingId(serviceId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/services/${serviceId}/check`, { method: 'POST' });
      if (!res.ok) throw new Error('Health probe failed');
      const updated: ServiceItem = await res.json();
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSuccessMsg(`Service checked: ${updated.lastStatus.toUpperCase()} (${updated.lastResponseMs}ms)`);
      setTimeout(() => setSuccessMsg(null), 3000);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Manual probe failed.');
    } finally {
      setCheckingId(null);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: targetProject,
          name: serviceName,
          url: serviceUrl,
          cadenceMinutes: cadence,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add service.');
      }

      const created: ServiceItem = await res.json();
      setServices((prev) => [...prev, created]);
      setShowAddModal(false);
      setServiceName('');
      setServiceUrl('');
      setSuccessMsg('Service registered and scheduled for monitoring.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not add service.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveIncidentId) return;
    setIsResolving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/incidents/${resolveIncidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to resolve incident.');
      }

      const resolved: IncidentItem = await res.json();
      setIncidents((prev) => prev.map((inc) => (inc.id === resolved.id ? resolved : inc)));
      setResolveIncidentId(null);
      setResolutionNote('');
      setSuccessMsg('Incident marked resolved.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not resolve incident.');
    } finally {
      setIsResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'up':
        return <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">UP</span>;
      case 'degraded':
        return <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400">DEGRADED</span>;
      case 'down':
        return <span className="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-400">DOWN</span>;
      default:
        return <span className="rounded bg-surface border border-line px-2 py-0.5 text-[11px] font-semibold text-fg-subtle">UNKNOWN</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Service Health & Incidents</h1>
          <p className="text-xs text-fg-muted">
            Continuous synthetic HTTP monitoring, cadence sweeps, and automated incident recovery (R049, R050, R051).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={activeProjectId || 'all'}
            onChange={(e) => router.push(e.target.value === 'all' ? '/services' : `/services?projectId=${e.target.value}`)}
            className="text-xs h-8 min-w-[150px]"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          {canWrite ? (
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              + Add Service
            </Button>
          ) : null}
        </div>
      </div>

      {errorMsg ? <Alert tone="error" title="Error">{errorMsg}</Alert> : null}
      {successMsg ? <Alert tone="success" title="Success">{successMsg}</Alert> : null}

      {/* Services Table */}
      <div className="rounded-surface border border-line bg-panel overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Monitored Endpoints ({services.length})</h2>
          <span className="text-xs text-fg-subtle">Automatic cadence sweeps active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-well border-b border-line text-fg-muted uppercase-label">
              <tr>
                <th className="p-3">Service</th>
                <th className="p-3">Status</th>
                <th className="p-3">Cadence</th>
                <th className="p-3">Response Time</th>
                <th className="p-3">24h Uptime</th>
                <th className="p-3">Last Checked</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-fg-subtle">
                    No services registered. Add an endpoint to start monitoring.
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id} className="hover:bg-hover/50 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-fg">{service.name}</div>
                      <div className="text-[11px] text-fg-subtle font-mono truncate max-w-xs">{service.url}</div>
                    </td>
                    <td className="p-3">{getStatusBadge(service.lastStatus)}</td>
                    <td className="p-3 font-mono">{service.cadenceMinutes}m</td>
                    <td className="p-3 font-mono">
                      {service.lastResponseMs ? `${service.lastResponseMs} ms` : '—'}
                    </td>
                    <td className="p-3 font-mono font-semibold">
                      <span className={service.uptime24h && service.uptime24h < 99 ? 'text-rose-400' : 'text-emerald-400'}>
                        {service.uptime24h ?? 100}%
                      </span>
                    </td>
                    <td className="p-3 text-fg-subtle">
                      {service.lastCheckedAt ? new Date(service.lastCheckedAt).toLocaleTimeString() : 'Pending'}
                    </td>
                    <td className="p-3 text-right">
                      {canWrite ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={checkingId === service.id}
                          onClick={() => handleManualCheck(service.id)}
                          className="text-xs h-7"
                        >
                          {checkingId === service.id ? 'Checking...' : 'Check Now'}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Timeline Section */}
      <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-sm font-semibold text-fg">Operational Incident Log</h2>
            <p className="text-xs text-fg-subtle">Automated failure detection and recovery audit timeline (R051).</p>
          </div>
        </div>

        {incidents.length === 0 ? (
          <p className="text-xs text-fg-subtle text-center py-6">No incidents recorded. All systems operational.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className={`rounded border p-4 flex flex-col gap-2 ${
                  inc.status === 'open' ? 'border-rose-500/40 bg-rose-500/5' : 'border-line bg-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          inc.status === 'open' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {inc.status}
                      </span>
                      <span className="text-xs font-semibold text-fg">{inc.title}</span>
                      <span className="text-xs text-fg-subtle font-mono">({inc.serviceName})</span>
                    </div>
                    <p className="text-xs text-fg-muted mt-1">{inc.summary}</p>
                  </div>

                  {inc.status === 'open' && canWrite ? (
                    <Button variant="secondary" size="sm" onClick={() => setResolveIncidentId(inc.id)} className="h-7 text-xs">
                      Resolve
                    </Button>
                  ) : null}
                </div>

                {inc.resolutionNote ? (
                  <div className="rounded bg-well p-2.5 text-xs text-fg-muted mt-1 border border-line">
                    <span className="font-semibold text-fg">Resolution: </span>
                    {inc.resolutionNote}
                  </div>
                ) : null}

                {/* Timeline Entries */}
                <div className="flex flex-col gap-1 pt-2 border-t border-line/40 text-[11px] text-fg-subtle">
                  {inc.timeline.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>• {entry.message} {entry.actor ? `(${entry.actor})` : ''}</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-1">Add Monitored Service</h3>
            <p className="text-xs text-fg-muted mb-4">Register an endpoint for synthetic HTTP health probes.</p>

            <form onSubmit={handleAddService} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs uppercase-label mb-1">Project</label>
                <Select value={targetProject} onChange={(e) => setTargetProject(e.target.value)}>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Service Name</label>
                <Input required value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Production API Gateway" />
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Target URL</label>
                <Input required type="url" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} placeholder="https://api.example.com/health" />
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Check Cadence</label>
                <Select value={cadence} onChange={(e) => setCadence(e.target.value as any)}>
                  <option value="1">Every 1 minute</option>
                  <option value="5">Every 5 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isAdding}>
                  {isAdding ? 'Saving...' : 'Register Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Resolve Incident Modal */}
      {resolveIncidentId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-1">Resolve Incident</h3>
            <p className="text-xs text-fg-muted mb-4">Document the root cause and fix applied.</p>

            <form onSubmit={handleResolveIncident} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs uppercase-label mb-1">Resolution Explanation</label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Root cause identified and service recovered..."
                  className="w-full rounded border border-line bg-surface p-2.5 text-xs text-fg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <Button type="button" variant="ghost" onClick={() => setResolveIncidentId(null)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isResolving}>
                  {isResolving ? 'Resolving...' : 'Confirm Resolution'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
