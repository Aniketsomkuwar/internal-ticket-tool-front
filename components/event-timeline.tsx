'use client';

import React from 'react';
import type { EventUrgency, EventStatus } from '@/shared/index';

export interface TimelineEventItem {
  id: string;
  projectId: string;
  projectName?: string;
  type: string;
  title: string;
  description: string;
  date: string;
  status: EventStatus;
  urgency: EventUrgency;
  responsibleRole: string;
  linkedTicketId: string | null;
  linkedTaskId: string | null;
  certificateDetails?: {
    issuer: string;
    domain: string;
    expiryDate: string | null;
  };
  contractDetails?: {
    parties: string;
    terms: string;
    startDate: string | null;
    endDate: string | null;
  };
  maintenanceDetails?: {
    window: string;
    completedWork: string;
    nextScheduled: string | null;
  };
}

export interface EventTimelineProps {
  events: TimelineEventItem[];
  onRenew?: (eventId: string) => void;
  canManage?: boolean;
}

export function EventTimeline({ events, onRenew, canManage = false }: EventTimelineProps) {
  const getUrgencyBadge = (urgency: EventUrgency, status: EventStatus) => {
    if (status === 'completed') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Completed
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
          Cancelled
        </span>
      );
    }
    if (urgency === 'overdue') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
          Overdue
        </span>
      );
    }
    if (urgency === 'due-soon') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          Due Soon
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-panel text-fg-muted border border-line">
        Upcoming
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {events.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-line rounded-surface text-xs text-fg-subtle">
          No dated obligations or renewals scheduled.
        </div>
      ) : (
        <div className="relative border-l-2 border-line/80 ml-4 pl-6 space-y-6">
          {events.map((e) => (
            <div key={e.id} className="relative group">
              {/* Dot */}
              <div
                className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-panel ${
                  e.status === 'completed'
                    ? 'bg-emerald-400'
                    : e.urgency === 'overdue'
                    ? 'bg-rose-500 ring-2 ring-rose-500/30'
                    : e.urgency === 'due-soon'
                    ? 'bg-amber-400'
                    : 'bg-indigo-500'
                }`}
              />

              <div className="p-4 rounded-well border border-line bg-well flex flex-col gap-2 hover:border-line-hover transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-panel border border-line text-indigo-400">
                        {e.type}
                      </span>
                      {getUrgencyBadge(e.urgency, e.status)}
                    </div>
                    <h4 className="text-sm font-semibold text-fg">{e.title}</h4>
                    {e.description && <p className="text-xs text-fg-subtle mt-0.5">{e.description}</p>}
                  </div>
                  {canManage && e.status !== 'completed' && onRenew && (
                    <button
                      onClick={() => onRenew(e.id)}
                      className="px-2.5 py-1 text-xs rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 whitespace-nowrap"
                    >
                      Renew
                    </button>
                  )}
                </div>

                {/* Event specific details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-line/60 text-xs text-fg-muted">
                  <div>
                    <span className="uppercase-label text-[10px] block">Date / Deadline</span>
                    <span className="font-mono text-fg font-medium">
                      {new Date(e.date).toLocaleDateString('en-US')}
                    </span>
                  </div>
                  <div>
                    <span className="uppercase-label text-[10px] block">Responsible Role</span>
                    <span className="capitalize text-fg font-medium">{e.responsibleRole}</span>
                  </div>
                  <div>
                    <span className="uppercase-label text-[10px] block">Status</span>
                    <span className="capitalize text-fg font-medium">{e.status}</span>
                  </div>
                </div>

                {e.certificateDetails && e.certificateDetails.domain && (
                  <p className="text-xs text-fg-subtle font-mono">
                    Domain: <span className="text-fg font-medium">{e.certificateDetails.domain}</span>
                    {e.certificateDetails.issuer && ` · Issuer: ${e.certificateDetails.issuer}`}
                  </p>
                )}

                {e.contractDetails && e.contractDetails.parties && (
                  <p className="text-xs text-fg-subtle">
                    Parties: <span className="text-fg font-medium">{e.contractDetails.parties}</span>
                  </p>
                )}

                {e.maintenanceDetails && e.maintenanceDetails.window && (
                  <p className="text-xs text-fg-subtle">
                    Window: <span className="text-fg font-medium">{e.maintenanceDetails.window}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
