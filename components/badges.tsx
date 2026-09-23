import React from 'react';
import { PRIORITY_LABELS, type Priority } from '@/shared';

export function PriorityBadge({ priority }: { priority: Priority | string }) {
  const p = priority as Priority;
  const label = PRIORITY_LABELS[p] ?? priority;

  let style = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
  if (p === 'P1') {
    style = 'bg-rose-500/15 text-rose-500 border-rose-500/30';
  } else if (p === 'P2') {
    style = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
  } else if (p === 'P3') {
    style = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  }

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium font-mono ${style}`}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  let style = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
  if (status === 'new') {
    style = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  } else if (status === 'in-progress') {
    style = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
  } else if (status === 'resolved') {
    style = 'bg-teal-500/15 text-teal-400 border-teal-500/30';
  } else if (status === 'escalated') {
    style = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  } else if (status === 'closed') {
    style = 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  }

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${style}`}>
      {status}
    </span>
  );
}
