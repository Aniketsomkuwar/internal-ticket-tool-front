'use client';

import React from 'react';

export interface ProgressSummaryProps {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  backlogTasks: number;
  percentage: number | null;
}

export function ProgressSummary({
  totalTasks,
  completedTasks,
  inProgressTasks,
  backlogTasks,
  percentage,
}: ProgressSummaryProps) {
  return (
    <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-fg">Project Milestone & Development Progress</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Derived directly from active engineering board tasks (never estimated by hand)
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-fg-muted uppercase-label block">Total Completion</span>
          <span className="text-2xl font-bold font-mono text-indigo-400">
            {percentage !== null ? `${percentage}%` : '—'}
          </span>
        </div>
      </div>

      {percentage !== null ? (
        <div className="w-full bg-well h-3 rounded-full overflow-hidden border border-line p-0.5">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : (
        <div className="p-3 bg-well rounded-well border border-line text-xs text-fg-subtle text-center">
          No tasks scheduled yet on the Kanban board.
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-line/60 text-center">
        <div className="p-2 rounded bg-well">
          <span className="text-xs text-fg-muted uppercase-label block">Total</span>
          <span className="text-base font-mono font-semibold text-fg">{totalTasks}</span>
        </div>
        <div className="p-2 rounded bg-well">
          <span className="text-xs text-fg-muted uppercase-label block">Backlog</span>
          <span className="text-base font-mono font-semibold text-fg-subtle">{backlogTasks}</span>
        </div>
        <div className="p-2 rounded bg-well">
          <span className="text-xs text-fg-muted uppercase-label block">In Progress</span>
          <span className="text-base font-mono font-semibold text-indigo-400">{inProgressTasks}</span>
        </div>
        <div className="p-2 rounded bg-well">
          <span className="text-xs text-fg-muted uppercase-label block">Done</span>
          <span className="text-base font-mono font-semibold text-emerald-400">{completedTasks}</span>
        </div>
      </div>
    </div>
  );
}
