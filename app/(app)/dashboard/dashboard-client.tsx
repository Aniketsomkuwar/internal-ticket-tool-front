'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Plus, Download, ArrowUpRight, Star, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PRIORITY_LABELS } from '@/shared/index';

interface DashboardData {
  period: string;
  scope: string;
  tickets: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
    byPriority: Record<string, number>;
  };
  tasks: {
    total: number;
    backlog: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
  };
  operations: {
    totalServices: number;
    servicesUp: number;
    servicesDegraded: number;
    servicesDown: number;
    activeIncidents: number;
    resolvedIncidents: number;
  };
  satisfaction: {
    nps: number | null;
    averageRating: number | null;
    totalResponses: number;
    promoters: number;
    passives: number;
    detractors: number;
    ratingsDistribution: Record<number, number>;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resourceType: string;
    performedAt: string;
  }>;
}

interface DashboardClientProps {
  initialData: DashboardData;
  projects: Array<{ id: string; name: string }>;
  activeProjectId?: string;
  activePeriod: string;
  canExport: boolean;
  isClient?: boolean;
  userRole?: string;
}

function MetricSummaryCards({ data, isClient }: { data: DashboardData; isClient?: boolean }) {
  const ticketsHref = isClient ? '/portal' : '/tickets';
  const tasksHref = isClient ? '/portal/project' : '/board';

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link
        href={ticketsHref}
        className="rounded-surface border border-line bg-panel p-4 flex flex-col gap-1 hover:border-indigo-500/50 hover:bg-panel/80 transition-all group cursor-pointer"
        title={isClient ? "Click to view your open support tickets" : "Click to view open tickets in Support Console"}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase-label font-bold text-fg-subtle group-hover:text-indigo-400 transition-colors">
            Open Tickets
          </span>
        </div>
        <span className="text-2xl font-bold font-mono text-fg">{data.tickets.open}</span>
        <span className="text-[11px] text-fg-subtle">{data.tickets.closed} closed in period</span>
      </Link>

      <Link
        href={tasksHref}
        className="rounded-surface border border-line bg-panel p-4 flex flex-col gap-1 hover:border-indigo-500/50 hover:bg-panel/80 transition-all group cursor-pointer"
        title={isClient ? "Click to view project tasks overview" : "Click to view tasks on Kanban Board"}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase-label font-bold text-fg-subtle group-hover:text-indigo-400 transition-colors">
            Tasks Overdue
          </span>
        </div>
        <span className={`text-2xl font-bold font-mono ${data.tasks.overdue > 0 ? 'text-rose-400' : 'text-fg'}`}>
          {data.tasks.overdue}
        </span>
        <span className="text-[11px] text-fg-subtle">{data.tasks.inProgress} currently in progress</span>
      </Link>

      <div className="rounded-surface border border-line bg-panel p-4 flex flex-col gap-1">
        <span className="text-xs uppercase-label font-bold text-fg-subtle">Net Promoter Score</span>
        <span
          className={`text-2xl font-bold font-mono ${data.satisfaction.nps !== null && data.satisfaction.nps >= 50
            ? 'text-emerald-400'
            : data.satisfaction.nps !== null && data.satisfaction.nps < 0
              ? 'text-rose-400'
              : 'text-fg'
            }`}
        >
          {data.satisfaction.nps !== null ? (data.satisfaction.nps > 0 ? `+${data.satisfaction.nps}` : data.satisfaction.nps) : '—'}
        </span>
        <span className="text-[11px] text-fg-subtle flex items-center">
          {data.satisfaction.totalResponses > 0
            ? <><Star className="size-3 text-amber-400 fill-amber-400 inline-block mr-1" /> Avg {data.satisfaction.averageRating} ({data.satisfaction.totalResponses} ratings)</>
            : 'No client ratings yet'}
        </span>
      </div>
    </div>
  );
}

function OperationsPanels({ data, isClient }: { data: DashboardData; isClient?: boolean }) {
  return (
    <div className={isClient ? 'flex flex-col gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
      {/* Support Tickets Breakdown */}
      <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-sm font-semibold text-fg">Support Queue Status</h2>
          <Link
            href={isClient ? '/portal' : '/tickets'}
            className="text-xs text-indigo-400 hover:underline"
          >
            {isClient ? 'My Tickets' : 'Support Console'}
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Link
            href={isClient ? '/portal' : '/tickets'}
            className="p-3 bg-surface rounded border border-line flex flex-col hover:border-indigo-500/50 hover:bg-panel/80 transition-all cursor-pointer group"
            title={isClient ? "View tickets needing attention" : "View open tickets in Support Console"}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-fg-subtle uppercase-label group-hover:text-indigo-400 transition-colors">Attention Needed</span>
            </div>
            <span className="text-lg font-bold font-mono text-fg mt-1">{data.tickets.open}</span>
          </Link>
          <div className="p-3 bg-surface rounded border border-line flex flex-col">
            <span className="text-[11px] text-fg-subtle uppercase-label">Resolved</span>
            <span className="text-lg font-bold font-mono text-emerald-400 mt-1">{data.tickets.resolved}</span>
          </div>
          <div className="p-3 bg-surface rounded border border-line flex flex-col">
            <span className="text-[11px] text-fg-subtle uppercase-label">Closed</span>
            <span className="text-lg font-bold font-mono text-fg-subtle mt-1">{data.tickets.closed}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <span className="text-xs font-semibold text-fg-muted">Active Tickets by Priority</span>
          <div className="flex flex-wrap gap-2">
            {['P1', 'P2', 'P3', 'P4'].map((pri) => (
              <div key={pri} className="px-2.5 py-1 rounded bg-surface border border-line text-xs flex items-center gap-2">
                <span className="font-semibold text-fg">{PRIORITY_LABELS[pri as keyof typeof PRIORITY_LABELS] || pri}:</span>
                <span className="font-mono font-bold text-fg-subtle">{data.tickets.byPriority[pri] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engineering Task Distribution */}
      <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-sm font-semibold text-fg">Engineering Task Distribution</h2>
          <Link href={isClient ? '/portal/project' : '/board'} className="text-xs text-indigo-400 hover:underline">
            {isClient ? 'Project Tasks' : 'Kanban Board'}
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="p-2.5 bg-surface rounded border border-line flex flex-col text-center">
            <span className="text-[10px] text-fg-subtle uppercase">Backlog</span>
            <span className="text-base font-bold font-mono text-fg mt-0.5">{data.tasks.backlog}</span>
          </div>
          <div className="p-2.5 bg-surface rounded border border-line flex flex-col text-center">
            <span className="text-[10px] text-fg-subtle uppercase">To Do</span>
            <span className="text-base font-bold font-mono text-fg mt-0.5">{data.tasks.todo}</span>
          </div>
          <div className="p-2.5 bg-surface rounded border border-line flex flex-col text-center">
            <span className="text-[10px] text-fg-subtle uppercase">In Progress</span>
            <span className="text-base font-bold font-mono text-indigo-400 mt-0.5">{data.tasks.inProgress}</span>
          </div>
          <div className="p-2.5 bg-surface rounded border border-line flex flex-col text-center">
            <span className="text-[10px] text-fg-subtle uppercase">Done</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-0.5">{data.tasks.done}</span>
          </div>
        </div>

        <Link
          href={isClient ? '/portal/project' : '/board'}
          className="rounded bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/50 p-3 flex items-center justify-between transition-colors cursor-pointer group"
          title={isClient ? "View project tasks" : "View overdue tasks on Kanban Board"}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-rose-300 font-medium group-hover:text-rose-200">Overdue Deadline Tasks</span>
            <ArrowUpRight className="size-3 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-mono text-sm font-bold text-rose-400">{data.tasks.overdue}</span>
        </Link>
      </div>

      {/* Client Satisfaction & NPS */}
      <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-4 md:col-span-2">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-sm font-semibold text-fg">Client Satisfaction & NPS</h2>
          <span className="text-xs text-fg-subtle">{data.satisfaction.totalResponses} ratings submitted</span>
        </div>

        {data.satisfaction.totalResponses === 0 ? (
          <p className="text-xs text-fg-subtle text-center py-6">
            No feedback responses recorded for this period yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] text-emerald-400 uppercase font-bold">Promoters (9–10)</p>
                <p className="text-base font-bold font-mono text-fg mt-0.5">{data.satisfaction.promoters}</p>
              </div>
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-400 uppercase font-bold">Passives (7–8)</p>
                <p className="text-base font-bold font-mono text-fg mt-0.5">{data.satisfaction.passives}</p>
              </div>
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                <p className="text-[10px] text-rose-400 uppercase font-bold">Detractors (0–6)</p>
                <p className="text-base font-bold font-mono text-fg mt-0.5">{data.satisfaction.detractors}</p>
              </div>
            </div>

            {/* Star Distribution Breakdown */}
            <div className="flex flex-col gap-1 pt-2 border-t border-line">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = data.satisfaction.ratingsDistribution[stars] ?? 0;
                const pct = data.satisfaction.totalResponses > 0 ? (count / data.satisfaction.totalResponses) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-12 font-mono text-fg-subtle flex items-center gap-1">
                      <span>{stars}</span>
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2 rounded bg-surface border border-line overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-fg-subtle">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardClient({
  initialData,
  projects,
  activeProjectId,
  activePeriod,
  canExport,
  isClient = false,
  userRole,
}: DashboardClientProps) {
  const router = useRouter();
  const [data] = useState<DashboardData>(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState(activePeriod);
  const [selectedProject, setSelectedProject] = useState(activeProjectId || 'all');

  const isCeo = userRole === 'ceo' || userRole === 'admin';

  // CEO Project Accordion / Dropdown state (maps projectId -> boolean)
  // By default, open the first project so cards are visible immediately
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>(() => {
    const firstProject = projects[0];
    if (firstProject) {
      return { [firstProject.id]: true };
    }
    return {};
  });

  const [projectDataMap, setProjectDataMap] = useState<Record<string, DashboardData>>({});
  const [loadingProjectMap, setLoadingProjectMap] = useState<Record<string, boolean>>({});

  const toggleProjectAccordion = (projectId: string) => {
    setOpenProjects((prev) => {
      const nextState = !prev[projectId];
      if (nextState && !projectDataMap[projectId] && !loadingProjectMap[projectId]) {
        // Fetch project data if not already cached
        fetchProjectData(projectId);
      }
      return { ...prev, [projectId]: nextState };
    });
  };

  const fetchProjectData = (projectId: string) => {
    setLoadingProjectMap((prev) => ({ ...prev, [projectId]: true }));
    fetch(`/api/dashboard?projectId=${projectId}&period=${selectedPeriod}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result) {
          setProjectDataMap((prev) => ({ ...prev, [projectId]: result }));
        }
      })
      .catch((err) => console.error(`Failed to load data for project ${projectId}:`, err))
      .finally(() => {
        setLoadingProjectMap((prev) => ({ ...prev, [projectId]: false }));
      });
  };

  // Pre-load data for projects that are open
  React.useEffect(() => {
    if (!isCeo) return;
    for (const p of projects) {
      if (openProjects[p.id]) {
        fetchProjectData(p.id);
      }
    }
  }, [isCeo, selectedPeriod]);

  const clientProjectName = projects[0]?.name || 'Client Project';
  const dashboardTitle = isClient
    ? `${clientProjectName} x Remostarts Dashboard`
    : isCeo
      ? 'Executive Command Center'
      : 'Unified Operations Dashboard';

  const handleFilterChange = (proj: string, per: string) => {
    setSelectedProject(proj);
    setSelectedPeriod(per);
    const query = proj === 'all' ? `?period=${per}` : `?projectId=${proj}&period=${per}`;
    router.push(`/dashboard${query}`);
  };

  const handleExportExcel = (targetData: DashboardData, label: string) => {
    const rows = [
      ['Metric Category', 'Key', 'Value'],
      ['Tickets', 'Total', targetData.tickets.total],
      ['Tickets', 'Open Attention', targetData.tickets.open],
      ['Tickets', 'Resolved', targetData.tickets.resolved],
      ['Tickets', 'Closed', targetData.tickets.closed],
      ['Tasks', 'Total', targetData.tasks.total],
      ['Tasks', 'Backlog', targetData.tasks.backlog],
      ['Tasks', 'To Do', targetData.tasks.todo],
      ['Tasks', 'In Progress', targetData.tasks.inProgress],
      ['Tasks', 'Done', targetData.tasks.done],
      ['Tasks', 'Overdue', targetData.tasks.overdue],
      ['Operations', 'Total Services', targetData.operations.totalServices],
      ['Operations', 'Services UP', targetData.operations.servicesUp],
      ['Operations', 'Active Incidents', targetData.operations.activeIncidents],
      ['Satisfaction', 'NPS', targetData.satisfaction.nps ?? 'No responses'],
      ['Satisfaction', 'Average Rating', targetData.satisfaction.averageRating ?? 'No responses'],
      ['Satisfaction', 'Total Responses', targetData.satisfaction.totalResponses],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
    XLSX.writeFile(workbook, `dashboard-summary-${label}-${selectedPeriod}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Header & Global Period Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-fg">{dashboardTitle}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* If NOT CEO and NOT Client, show standard single project dropdown */}
          {!isClient && !isCeo && (
            <Select
              value={selectedProject}
              onChange={(e) => handleFilterChange(e.target.value, selectedPeriod)}
              className="text-xs h-8 min-w-[150px]"
            >
              <option value="all">All Projects (Org Scope)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}

          <Select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              if (!isCeo) {
                handleFilterChange(selectedProject, e.target.value);
              }
            }}
            className="text-xs h-8 min-w-[110px]"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </Select>

          {isClient ? (
            <Link
              href="/portal/new"
              className="px-3 py-1.5 rounded-surface bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="size-3.5" />
              <span>File Ticket</span>
            </Link>
          ) : null}

          {canExport ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExportExcel(data, isCeo ? 'unified-all' : selectedProject)}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <span>Export Excel (.xlsx)</span>
              <Download className="size-3" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* CEO MULTI-PROJECT VIEW */}
      {isCeo ? (
        <div className="flex flex-col gap-10">
          {/* SECTION 1: Unified Org Overview (All Projects) */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <span className="text-xs text-fg-subtle font-mono">
                • {projects.length} Active {projects.length === 1 ? 'Project' : 'Projects'}
              </span>
            </div>

            <MetricSummaryCards data={data} isClient={false} />
            <OperationsPanels data={data} isClient={false} />
          </section>

          {/* SECTION 2: Project-Specific Cards (Collapsible Dropdowns like FAQ) */}
          <section className="flex flex-col gap-4 pt-4 border-t border-line/60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase-label text-fg tracking-wider">
                  Individual Projects Breakdown
                </h2>
                <p className="text-xs text-fg-muted mt-0.5">
                  Click on any project to expand or collapse its dedicated metrics and support queue.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {projects.map((proj) => {
                const isOpen = !!openProjects[proj.id];
                const projData = projectDataMap[proj.id];
                const isLoading = !!loadingProjectMap[proj.id];

                return (
                  <div
                    key={proj.id}
                    className="rounded-lg border border-line bg-panel overflow-hidden transition-all duration-200"
                  >
                    {/* Collapsible Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleProjectAccordion(proj.id)}
                      className="w-full px-5 py-3.5 flex items-center justify-between bg-panel/60 hover:bg-panel transition-colors text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-2 rounded-full bg-indigo-400" />
                        <span className="text-sm font-semibold text-fg tracking-wide">{proj.name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-fg-muted">
                        <span className="text-xs">{isOpen ? 'Collapse' : 'Expand'}</span>
                        {isOpen ? (
                          <ChevronDown className="size-4 text-fg" />
                        ) : (
                          <ChevronRight className="size-4 text-fg-muted" />
                        )}
                      </div>
                    </button>

                    {/* Collapsible Accordion Content */}
                    {isOpen && (
                      <div className="p-5 border-t border-line/70 flex flex-col gap-5 bg-panel/30">
                        {isLoading ? (
                          <div className="p-8 text-center text-xs text-fg-muted bg-surface rounded-surface border border-line">
                            Loading metrics for {proj.name}...
                          </div>
                        ) : projData ? (
                          <>
                            <MetricSummaryCards data={projData} isClient={false} />
                            <OperationsPanels data={projData} isClient={false} />
                          </>
                        ) : (
                          <div className="p-6 text-center text-xs text-fg-subtle bg-surface rounded-surface border border-line">
                            No metrics available for {proj.name}.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* STANDARD VIEW (Clients, Developers, Admins) */
        <div className="flex flex-col gap-6">
          <MetricSummaryCards data={data} isClient={isClient} />
          <OperationsPanels data={data} isClient={isClient} />
        </div>
      )}
    </div>
  );
}

