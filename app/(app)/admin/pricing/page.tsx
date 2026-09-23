import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { PermissionDenied } from '../../../../components/permission-denied';
import { AdminPricingClient } from './pricing-client';

export default async function AdminPricingPage() {
  const session = await getSessionState();
  if (session.status !== 'authenticated' || !session.user) {
    redirect('/login');
  }

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes('pricing:write')) {
    return (
      <PermissionDenied
        permission="pricing:write"
      />
    );
  }

  let projects: any[] = [];
  const pricingMap: Record<string, any> = {};

  try {
    const projectsRes = await fetchAsCaller('/api/projects');
    if (projectsRes.ok) {
      projects = await projectsRes.json();
      if (projects.length > 0) {
        const firstProjectId = projects[0].id;
        const pricingRes = await fetchAsCaller(`/api/projects/${firstProjectId}/pricing`);
        if (pricingRes.ok) {
          pricingMap[firstProjectId] = await pricingRes.json();
        }
      }
    }
  } catch {
    // fallback
  }

  return (
    <AdminPricingClient
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      initialPricingMap={pricingMap}
    />
  );
}
