import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied } from '../../../components/permission-denied';
import { EventsClient } from './events-client';

export default async function EventsPage() {
  const session = await getSessionState();
  if (session.status !== 'authenticated' || !session.user) {
    redirect('/login');
  }

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes('events:read')) {
    return (
      <PermissionDenied
        permission="events:read"
      />
    );
  }

  const canManage = permissions.includes('events:write');

  let events: any[] = [];
  let projects: any[] = [];

  try {
    const [eventsRes, projectsRes] = await Promise.all([
      fetchAsCaller('/api/events'),
      fetchAsCaller('/api/projects'),
    ]);
    if (eventsRes.ok) events = await eventsRes.json();
    if (projectsRes.ok) projects = await projectsRes.json();
  } catch {
    // fallback
  }

  return (
    <div className="flex flex-col gap-6">
      <EventsClient
        initialEvents={events}
        projects={projects.map((p: any) => ({ id: p.id, name: p.name }))}
        canManage={canManage}
      />
    </div>
  );
}
