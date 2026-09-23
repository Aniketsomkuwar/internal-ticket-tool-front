import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { ProjectStatusClient, type ProjectDetail } from './project-status-client';

interface ClientProjectDashboardPageProps {
  searchParams?: { projectId?: string };
}

export default async function ClientProjectDashboardPage({ searchParams }: ClientProjectDashboardPageProps) {
  const session = await getSessionState();
  if (session.status !== 'authenticated' || !session.user) {
    redirect('/login');
  }

  // Find caller's project(s)
  let projects: any[] = [];
  try {
    const res = await fetchAsCaller('/api/projects');
    if (res.ok) projects = await res.json();
  } catch {
    // fallback
  }

  if (projects.length === 0) {
    return (
      <div className="p-8 border border-line rounded-surface bg-panel text-center flex flex-col gap-3">
        <h2 className="text-base font-bold text-fg">Your Project is Not Set Up Yet</h2>
        <p className="text-xs text-fg-muted max-w-md mx-auto">
          Your organization does not have an active project assigned. Please contact your support team or account manager.
        </p>
      </div>
    );
  }

  const isCeo = session.user.role === 'ceo';
  const canEdit = session.user.role !== 'client';

  // Helper to fetch details for a single project
  const fetchDetailForProject = async (proj: any): Promise<ProjectDetail> => {
    let progress: any = { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, backlogTasks: 0, percentage: null };
    let pricing: any = { items: [], totalMonthlyCostFormatted: '$0.00' };
    let links: any[] = [];
    let assets: any[] = [];
    let events: any[] = [];
    let openTicketsCount = 0;

    try {
      const [progRes, priceRes, linksRes, assetsRes, eventsRes, ticketsRes] = await Promise.all([
        fetchAsCaller(`/api/projects/${proj.id}/progress`),
        fetchAsCaller(`/api/projects/${proj.id}/pricing`),
        fetchAsCaller(`/api/projects/${proj.id}/links`),
        fetchAsCaller(`/api/projects/${proj.id}/assets`),
        fetchAsCaller(`/api/events?projectId=${proj.id}`),
        fetchAsCaller(`/api/tickets?projectId=${proj.id}&pageSize=100`),
      ]);

      if (progRes.ok) progress = await progRes.json();
      if (priceRes.ok) pricing = await priceRes.json();
      if (linksRes.ok) links = await linksRes.json();
      if (assetsRes.ok) assets = await assetsRes.json();
      if (eventsRes.ok) events = await eventsRes.json();
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        const ticketList: any[] = Array.isArray(ticketsData)
          ? ticketsData
          : Array.isArray(ticketsData.tickets)
          ? ticketsData.tickets
          : [];
        openTicketsCount = ticketList.filter((t) => t.status !== 'closed').length;
      }
    } catch {
      // fallback
    }

    return {
      project: {
        id: proj.id,
        name: proj.name,
        slug: proj.slug,
        clientName: proj.clientName,
        description: proj.description,
      },
      progress,
      pricing,
      links,
      assets,
      events,
      openTicketsCount,
    };
  };

  const initialDetails: Record<string, ProjectDetail> = {};

  if (isCeo) {
    // For CEO, fetch details for ALL projects so CEO can see all projects and their data
    const details = await Promise.all(projects.map((p) => fetchDetailForProject(p)));
    details.forEach((d) => {
      initialDetails[d.project.id] = d;
    });
  } else {
    // For regular users, fetch selected project (or first project)
    const targetProject =
      projects.find((p) => p.id === searchParams?.projectId) || projects[0];
    const detail = await fetchDetailForProject(targetProject);
    initialDetails[targetProject.id] = detail;
  }

  return (
    <ProjectStatusClient
      projects={projects}
      initialDetails={initialDetails}
      isCeo={isCeo}
      canEdit={canEdit}
      selectedProjectId={searchParams?.projectId}
    />
  );
}

