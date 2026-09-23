'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Alert } from '../../../../components/ui/alert';

export interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  clientName: string;
  description: string;
  status: string;
  memberCount: number;
}

export function ProjectsClient({ initialProjects }: { initialProjects: ProjectItem[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // New project state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');

  // New client account state
  const [clientEmail, setClientEmail] = useState('');
  const [clientUsername, setClientUsername] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientFullName, setClientFullName] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, clientName, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create project');
      }

      const created = await res.json();
      setProjects((prev) => [...prev, created]);
      setSuccessMsg(`Project ${name} created successfully.`);
      setShowCreateModal(false);
      setName('');
      setSlug('');
      setClientName('');
      setDescription('');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClientAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/projects/client-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          email: clientEmail,
          username: clientUsername,
          password: clientPassword,
          fullName: clientFullName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create client account');
      }

      setCreatedCredentials({ email: clientEmail, pass: clientPassword });
      setClientEmail('');
      setClientUsername('');
      setClientPassword('');
      setClientFullName('');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {errorMsg ? <Alert tone="error" title="Action failed">{errorMsg}</Alert> : null}
      {successMsg ? <Alert tone="success" title="Success">{successMsg}</Alert> : null}

      <div className="flex justify-between items-center border-b border-line pb-4">
        <p className="text-xs text-fg-muted">Manage client organisations and project access barriers.</p>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
          + New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p.id} className="rounded-surface border border-line bg-panel p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-fg">{p.name}</h3>
                <span className="text-xs font-mono text-fg-subtle border border-line rounded px-1.5 py-0.5">
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-fg-subtle mt-0.5 font-mono">Client: {p.clientName} · /{p.slug}</p>
              <p className="text-xs text-fg-muted mt-2 line-clamp-2">
                {p.description || 'No description provided.'}
              </p>
            </div>

            <div className="border-t border-line pt-3 flex justify-between items-center">
              <span className="text-xs text-fg-muted">{p.memberCount} member{p.memberCount === 1 ? '' : 's'}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setCreatedCredentials(null);
                  setShowClientModal(true);
                }}
                className="text-xs"
              >
                + Client Login
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-fg mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs uppercase-label mb-1">Project Name</label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="RootRemit" />
              </div>
              <div>
                <label className="block text-xs uppercase-label mb-1">Project Slug</label>
                <Input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="rootremit" />
              </div>
              <div>
                <label className="block text-xs uppercase-label mb-1">Client Name</label>
                <Input required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Esame Ltd" />
              </div>
              <div>
                <label className="block text-xs uppercase-label mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Primary core banking and remittance project"
                  className="w-full rounded border border-line bg-surface p-2 text-sm text-fg"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Client Account Handover Modal */}
      {showClientModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-fg mb-2">Create Client Login</h2>
            <p className="text-xs text-fg-muted mb-4">Issues credentials scoped strictly to this project.</p>

            {createdCredentials ? (
              <div className="flex flex-col gap-3">
                <Alert tone="success" title="Client Account Ready">
                  Hand over these credentials to the client. This password is displayed only once.
                </Alert>
                <div className="rounded border border-line bg-well p-3 font-mono text-xs text-fg flex flex-col gap-1">
                  <div>Email: <b>{createdCredentials.email}</b></div>
                  <div>Password: <b>{createdCredentials.pass}</b></div>
                </div>
                <Button variant="primary" size="sm" onClick={() => setShowClientModal(false)} className="mt-2">
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateClientAccount} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs uppercase-label mb-1">Full Name</label>
                  <Input required value={clientFullName} onChange={(e) => setClientFullName(e.target.value)} placeholder="Client Contact" />
                </div>
                <div>
                  <label className="block text-xs uppercase-label mb-1">Email</label>
                  <Input required type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contact@client.com" />
                </div>
                <div>
                  <label className="block text-xs uppercase-label mb-1">Username</label>
                  <Input required value={clientUsername} onChange={(e) => setClientUsername(e.target.value)} placeholder="client_user" />
                </div>
                <div>
                  <label className="block text-xs uppercase-label mb-1">Temporary Password</label>
                  <Input required type="password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} placeholder="Min 8 chars" />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowClientModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Generating...' : 'Issue Login'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
