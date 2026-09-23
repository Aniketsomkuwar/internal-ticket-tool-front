'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Select } from '../../../components/ui/select';
import { StatusBadge, PriorityBadge } from '../../../components/badges';
import { Plus, Search, Filter, X } from 'lucide-react';

export interface ClientTicketRow {
  id: string;
  reference: string;
  projectName: string;
  title: string;
  priority: string;
  status: string;
  lastActivityAt: string;
  createdAt: string;
}

type StatusFilter = 'all' | 'open' | 'closed';

export function PortalClient({ initialTickets }: { initialTickets: ClientTicketRow[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredTickets = useMemo(() => {
    return initialTickets.filter((t) => {
      // Status filter
      if (statusFilter === 'open' && t.status === 'closed') return false;
      if (statusFilter === 'closed' && t.status !== 'closed') return false;

      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesRef = t.reference.toLowerCase().includes(q);
        const matchesTitle = t.title.toLowerCase().includes(q);
        if (!matchesRef && !matchesTitle) return false;
      }

      return true;
    });
  }, [initialTickets, statusFilter, priorityFilter, search]);

  const openCount = useMemo(() => initialTickets.filter((t) => t.status !== 'closed').length, [initialTickets]);
  const closedCount = useMemo(() => initialTickets.filter((t) => t.status === 'closed').length, [initialTickets]);

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'open' || priorityFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('open');
    setPriorityFilter('all');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">My Support Tickets</h1>
        </div>
        <Link href="/portal/new">
          <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-sm">
            <Plus className="size-3.5" />
            <span>Raise New Ticket</span>
          </Button>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-panel p-3 rounded-surface border border-line">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1 bg-well p-1 rounded-control border border-line">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              statusFilter === 'open'
                ? 'bg-selected text-fg font-semibold shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <span>Active / Open</span>
            <span className="px-1.5 py-0.2 rounded-pill bg-well text-[10px] font-mono">
              {openCount}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              statusFilter === 'closed'
                ? 'bg-selected text-fg font-semibold shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <span>Resolved & Closed</span>
            <span className="px-1.5 py-0.2 rounded-pill bg-well text-[10px] font-mono">
              {closedCount}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-selected text-fg font-semibold shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-pill bg-well text-[10px] font-mono">
              {initialTickets.length}
            </span>
          </button>
        </div>

        {/* Search & Priority Controls */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
            <input
              type="text"
              placeholder="Search reference or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-control border border-line bg-surface text-fg placeholder:text-fg-subtle focus:border-indigo-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 text-xs min-w-[120px]"
          >
            <option value="all">All Priorities</option>
            <option value="P1">P1 - Urgent</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Normal</option>
            <option value="P4">P4 - Low</option>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-fg-subtle hover:text-fg flex items-center gap-1"
              title="Reset filters"
            >
              <X className="size-3" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tickets List / Empty State */}
      {initialTickets.length === 0 ? (
        <div className="rounded-surface border border-line bg-panel p-8 text-center flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-fg">No tickets submitted yet</p>
          <p className="text-xs text-fg-muted max-w-sm">
            When you run into an issue or have a request for your project, file a ticket here and our team will get on it immediately.
          </p>
          <Link href="/portal/new">
            <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
              <Plus className="size-3.5" />
              <span>Raise Ticket</span>
            </Button>
          </Link>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-surface border border-line bg-panel p-8 text-center flex flex-col items-center gap-2">
          <Filter className="size-6 text-fg-subtle" />
          <p className="text-sm font-medium text-fg">No tickets match your filters</p>
          <p className="text-xs text-fg-muted">
            Try adjusting your search query, priority, or switching to the &ldquo;All&rdquo; tab.
          </p>
          <Button variant="secondary" size="sm" onClick={clearFilters} className="mt-2 text-xs">
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-line bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-well text-xs uppercase text-fg-subtle">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-hover transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-fg">
                    <Link href={`/portal/${t.reference}`} className="hover:underline text-indigo-400">
                      {t.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-fg">
                    <Link href={`/portal/${t.reference}`} className="hover:underline">
                      {t.title}
                    </Link>
                    <div className="text-xs text-fg-subtle">{t.projectName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-fg-muted font-mono">
                    {new Date(t.lastActivityAt).toLocaleDateString('en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
