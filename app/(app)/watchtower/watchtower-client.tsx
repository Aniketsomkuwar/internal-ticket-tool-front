'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PriorityBadge } from '../../../components/badges';
import { Select } from '../../../components/ui/select';
import { AlertTriangle, Clock } from 'lucide-react';
import { useSWR } from '../../../lib/use-swr';
import { fetcher } from '../../../lib/fetcher';

interface TaskSummary {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: string;
  column: string;
  position: number;
  assigneeName: string | null;
  dueDate: string | null;
}

interface WatchtowerData {
  overdue: TaskSummary[];
  dueToday: TaskSummary[];
  loadByPriority: Record<string, number>;
}

interface WatchtowerClientProps {
  initialData: WatchtowerData;
  projects: Array<{ id: string; name: string }>;
}

export function WatchtowerClient({ initialData, projects }: WatchtowerClientProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  
  const url = selectedProjectId === 'all' ? '/api/watchtower' : `/api/watchtower?projectId=${selectedProjectId}`;
  
  const { data, isValidating: isLoading } = useSWR<WatchtowerData>(
    url,
    fetcher,
    { fallbackData: initialData }
  );

  const handleProjectFilter = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  // Ensure data exists before trying to access it (fallback to initialData if undefined during first render somehow)
  const currentData = data || initialData;
  
  const totalOverdue = currentData.overdue.length;
  const totalDueToday = currentData.dueToday.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Watchtower</h1>
          <p className="text-xs text-fg-muted">
            High-urgency operational attention: overdue tasks, daily deadlines, and engineering bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs uppercase-label">Project Scope:</label>
          <Select
            value={selectedProjectId}
            onChange={(e) => handleProjectFilter(e.target.value)}
            className="text-xs h-8 min-w-[160px]"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-surface border border-rose-500/30 bg-rose-500/5 p-4 flex flex-col gap-1">
          <span className="text-xs uppercase-label font-bold text-rose-400">Overdue Tasks</span>
          <span className="text-2xl font-bold font-mono text-fg">{totalOverdue}</span>
          <span className="text-[11px] text-fg-subtle">Requires immediate intervention</span>
        </div>

        <div className="rounded-surface border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col gap-1">
          <span className="text-xs uppercase-label font-bold text-amber-400">Due Today</span>
          <span className="text-2xl font-bold font-mono text-fg">{totalDueToday}</span>
          <span className="text-[11px] text-fg-subtle">Closing by end of business</span>
        </div>

        <div className="rounded-surface border border-indigo-500/30 bg-indigo-500/5 p-4 flex flex-col gap-1">
          <span className="text-xs uppercase-label font-bold text-indigo-400">Active Urgent Tasks</span>
          <span className="text-2xl font-bold font-mono text-fg">
            {(currentData.loadByPriority['urgent'] ?? 0) + (currentData.loadByPriority['high'] ?? 0)}
          </span>
          <span className="text-[11px] text-fg-subtle">High & Urgent priority load</span>
        </div>
      </div>

      {/* Main Attention Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overdue Section */}
        <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-400" /> Overdue Items ({totalOverdue})
            </h2>
            <Link href="/board" className="text-xs text-indigo-400 hover:underline">
              Open Board ↗
            </Link>
          </div>

          {isLoading && !currentData.overdue ? (
            <p className="text-xs text-fg-subtle py-8 text-center">Refreshing...</p>
          ) : currentData.overdue.length === 0 ? (
            <p className="text-xs text-fg-subtle py-8 text-center">No overdue tasks. All projects are on track.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto">
              {currentData.overdue.map((task) => (
                <div
                  key={task.id}
                  className="rounded border border-line bg-surface p-3 flex flex-col gap-1.5 hover:border-rose-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-fg">{task.title}</span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  {task.description ? (
                    <p className="text-[11px] text-fg-muted line-clamp-1">{task.description}</p>
                  ) : null}
                  <div className="flex items-center justify-between text-[10px] text-fg-subtle pt-1 border-t border-line/40 font-mono">
                    <span>Assignee: {task.assigneeName || 'Unassigned'}</span>
                    <span className="text-rose-400 font-semibold">
                      Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US') : 'Past due'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due Today Section */}
        <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
              <Clock className="size-4 text-amber-400" /> Due Today ({totalDueToday})
            </h2>
            <Link href="/board" className="text-xs text-indigo-400 hover:underline">
              Open Board ↗
            </Link>
          </div>

          {isLoading && !currentData.dueToday ? (
            <p className="text-xs text-fg-subtle py-8 text-center">Refreshing...</p>
          ) : currentData.dueToday.length === 0 ? (
            <p className="text-xs text-fg-subtle py-8 text-center">No tasks due today.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto">
              {currentData.dueToday.map((task) => (
                <div
                  key={task.id}
                  className="rounded border border-line bg-surface p-3 flex flex-col gap-1.5 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-fg">{task.title}</span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  {task.description ? (
                    <p className="text-[11px] text-fg-muted line-clamp-1">{task.description}</p>
                  ) : null}
                  <div className="flex items-center justify-between text-[10px] text-fg-subtle pt-1 border-t border-line/40 font-mono">
                    <span>Assignee: {task.assigneeName || 'Unassigned'}</span>
                    <span className="text-amber-400 font-semibold">Due: Today</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Priority Distribution Matrix */}
      <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-fg">Active Load Breakdown by Priority</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {['urgent', 'high', 'medium', 'low'].map((p) => {
            const count = currentData.loadByPriority[p] ?? 0;
            return (
              <div key={p} className="rounded border border-line bg-surface p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={p} />
                  <span className="text-xs capitalize text-fg-muted">{p}</span>
                </div>
                <span className="font-mono text-sm font-bold text-fg">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
