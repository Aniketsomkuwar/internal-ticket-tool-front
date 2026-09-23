'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProgressSummary } from '../../../../components/progress-summary';
import { RoadmapList } from '../../../../components/roadmap-list';
import { PricingTable } from '../../../../components/pricing-table';
import { DocumentationHub } from '../../../../components/documentation-hub';
import { AssetList } from '../../../../components/asset-list';
import { EventTimeline } from '../../../../components/event-timeline';
import { Select } from '../../../../components/ui/select';
import { Ticket, Plus, FolderKanban, ChevronDown, ChevronRight, Layers } from 'lucide-react';

export interface ProjectDetail {
  project: {
    id: string;
    name: string;
    slug: string;
    clientName: string;
    description?: string;
  };
  progress: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    backlogTasks: number;
    percentage: number | null;
    roadmap?: {
      inProgress: any[];
      upcoming: any[];
      completed: any[];
    };
  };
  pricing: {
    items: any[];
    totalMonthlyCostFormatted: string;
  };
  links: any[];
  assets: any[];
  events: any[];
  openTicketsCount: number;
}

interface ProjectStatusClientProps {
  projects: Array<{ id: string; name: string; slug: string; clientName: string }>;
  initialDetails: Record<string, ProjectDetail>;
  isCeo: boolean;
  canEdit: boolean;
  selectedProjectId?: string;
}

export function ProjectStatusClient({
  projects,
  initialDetails,
  isCeo,
  canEdit,
  selectedProjectId,
}: ProjectStatusClientProps) {
  const router = useRouter();

  // For CEO multi-project view: accordion state (default first project open, or all collapsible)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(() => {
    if (isCeo) {
      // Default: open all projects or the first one
      const state: Record<string, boolean> = {};
      projects.forEach((p, idx) => {
        state[p.id] = idx === 0; // first project expanded by default
      });
      return state;
    }
    return {};
  });

  const toggleAccordion = (projId: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [projId]: !prev[projId],
    }));
  };

  // If user is not CEO, we show a project selector dropdown (if multiple projects exist) or single project view
  const currentProjectId = selectedProjectId || (projects[0]?.id ?? '');
  const handleSingleProjectChange = (newProjId: string) => {
    router.push(`/portal/project?projectId=${newProjId}`);
  };

  // Helper renderer for a single project's complete dashboard card stack
  const renderProjectCard = (detail: ProjectDetail) => {
    const { project, progress, pricing, links, assets, events, openTicketsCount } = detail;

    return (
      <div key={project.id} className="flex flex-col gap-6">
        {/* Project Header Banner */}
        <div className="p-6 rounded-surface border border-line bg-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>

            <h2 className="text-xl font-bold text-fg">{project.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="px-4 py-2 rounded-surface bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30 flex items-center gap-2 transition-colors"
            >
              <Ticket className="size-3.5" />
              <span>Support Tickets</span>
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-[10px] font-mono">
                {openTicketsCount} open
              </span>
            </Link>
            <Link
              href="/portal/new"
              className="px-4 py-2 rounded-surface bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-600/30 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>File Ticket</span>
            </Link>
          </div>
        </div>

        {/* Development Progress & Roadmap */}
        <div>
          <ProgressSummary
            totalTasks={progress.totalTasks}
            completedTasks={progress.completedTasks}
            inProgressTasks={progress.inProgressTasks}
            backlogTasks={progress.backlogTasks}
            percentage={progress.percentage}
          />
          {progress.roadmap && <RoadmapList roadmap={progress.roadmap} />}
        </div>

        {/* Documentation Hub */}
        <DocumentationHub
          projectId={project.id}
          initialLinks={links}
          canEdit={canEdit}
        />

        {/* Operational Running Costs */}
        <PricingTable
          items={pricing.items}
          totalFormatted={pricing.totalMonthlyCostFormatted}
          isClientView={true}
        />

        {/* Project Assets & Deliverables */}
        <AssetList assets={assets} />

        {/* Dated Events & Obligations */}
        <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-fg">Upcoming Obligations & Renewals</h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Certificates, scheduled maintenance and contract timelines for {project.name}
            </p>
          </div>
          <EventTimeline events={events} canManage={false} />
        </div>
      </div>
    );
  };

  // 1. CEO VIEW: Sees ALL projects with executive header and accordion project views
  if (isCeo) {
    return (
      <div className="flex flex-col gap-8">
        {/* CEO Executive Portfolio Banner */}
        <div className="p-6 rounded-surface border border-line bg-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-fg">All Projects</h1>
            <p className="text-xs text-fg-muted">
              Portfolio-wide overview across all <span className="text-fg font-semibold">{projects.length} active projects</span>. Track engineering progress, documentation, infrastructure costs, and deliverables for every client.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allOpen = Object.values(openAccordions).every(Boolean);
                const nextState: Record<string, boolean> = {};
                projects.forEach((p) => {
                  nextState[p.id] = !allOpen;
                });
                setOpenAccordions(nextState);
              }}
              className="px-3 py-1.5 rounded bg-surface border border-line text-xs font-semibold text-fg hover:bg-hover transition-colors"
            >
              {Object.values(openAccordions).every(Boolean) ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Project List / Accordions */}
        <div className="flex flex-col gap-6">
          {projects.map((proj) => {
            const isOpen = !!openAccordions[proj.id];
            const detail = initialDetails[proj.id];

            return (
              <div
                key={proj.id}
                className="rounded-xl border border-line bg-panel/60 overflow-hidden transition-all duration-200"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(proj.id)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-panel hover:bg-hover/80 transition-colors text-left focus:outline-none border-b border-line/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <FolderKanban className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-fg">{proj.name}</span>
                      </div>
                      {detail && (
                        <div className="flex items-center gap-4 text-xs text-fg-muted mt-1">
                          <span>
                            Progress:{' '}
                            <strong className="text-indigo-400 font-mono">
                              {detail.progress.percentage !== null ? `${detail.progress.percentage}%` : '0%'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Monthly Cost:{' '}
                            <strong className="text-emerald-400 font-mono">
                              {detail.pricing.totalMonthlyCostFormatted}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Open Tickets:{' '}
                            <strong className="text-fg font-mono">
                              {detail.openTicketsCount}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-fg-muted">
                    <span className="text-xs font-medium">{isOpen ? 'Collapse' : 'Expand Project Data'}</span>
                    {isOpen ? (
                      <ChevronDown className="size-4 text-fg" />
                    ) : (
                      <ChevronRight className="size-4 text-fg-muted" />
                    )}
                  </div>
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="p-6 bg-surface/30 flex flex-col gap-6">
                    {detail ? (
                      renderProjectCard(detail)
                    ) : (
                      <div className="p-8 text-center text-xs text-fg-muted bg-surface rounded-surface border border-line">
                        No data available for {proj.name}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. STANDARD / CLIENT VIEW
  const currentDetail = initialDetails[currentProjectId] || Object.values(initialDetails)[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Project Switcher for non-CEO users who have access to multiple projects */}
      {projects.length > 1 && (
        <div className="flex items-center justify-between p-3.5 rounded-surface border border-line bg-panel">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-indigo-400" />
            <span className="text-xs font-semibold text-fg">Active Project:</span>
          </div>
          <Select
            value={currentProjectId}
            onChange={(e) => handleSingleProjectChange(e.target.value)}
            className="text-xs h-8 min-w-[200px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.clientName})
              </option>
            ))}
          </Select>
        </div>
      )}

      {currentDetail ? (
        renderProjectCard(currentDetail)
      ) : (
        <div className="p-8 border border-line rounded-surface bg-panel text-center flex flex-col gap-3">
          <h2 className="text-base font-bold text-fg">No Project Details Available</h2>
          <p className="text-xs text-fg-muted">
            Please select an active project to view details.
          </p>
        </div>
      )}
    </div>
  );
}
