'use client';

import React, { useState } from 'react';
import { CopyButton } from './copy-button';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { LINK_KINDS, type LinkKind } from '@/shared';
import { ExternalLink, Plus, Trash2, PenTool, Globe, Server, FileText, MonitorSmartphone, LayoutDashboard, Link2 } from 'lucide-react';

export interface HubLinkItem {
  id: string;
  projectId: string;
  kind: string;
  label: string;
  url: string;
  notes: string;
  position: number;
}

export interface DocumentationHubProps {
  projectId: string;
  initialLinks: HubLinkItem[];
  canEdit?: boolean;
}

const KIND_LABELS: Record<string, string> = {
  figma: 'Figma Design',
  openapi: 'OpenAPI Spec',
  postman: 'Postman Collection',
  third_party_docs: '3rd Party Docs',
  prd: 'PRD / Requirements',
  frontend_local: 'Local Environment',
  frontend_staging: 'Staging Environment',
  frontend_production: 'Production App',
  testing_dashboard: 'Testing Dashboard',
  custom: 'Documentation',
};

const KIND_ICONS: Record<string, React.ElementType> = {
  figma: PenTool,
  openapi: Globe,
  postman: Server,
  third_party_docs: FileText,
  prd: FileText,
  frontend_local: MonitorSmartphone,
  frontend_staging: MonitorSmartphone,
  frontend_production: MonitorSmartphone,
  testing_dashboard: LayoutDashboard,
  custom: Link2,
};

export function DocumentationHub({ projectId, initialLinks, canEdit = false }: DocumentationHubProps) {
  const [links, setLinks] = useState<HubLinkItem[]>(initialLinks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKind, setNewKind] = useState<LinkKind>('openapi');
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newUrl) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: newKind,
          label: newLabel,
          url: newUrl,
          notes: newNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add link');
      }

      const created = await res.json();
      setLinks((prev) => [...prev, created]);
      setNewLabel('');
      setNewUrl('');
      setNewNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Remove this link from the Documentation Hub?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/links/${linkId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="rounded-surface border border-line bg-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-fg">Documentation Hub</h2>
          <p className="text-xs text-fg-muted mt-0.5">Specifications, design assets, and environment links for this project</p>
        </div>
        {canEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddForm((v) => !v)}
            className="text-xs h-7 flex items-center gap-1"
          >
            {showAddForm ? 'Cancel' : (
              <>
                <Plus className="size-3" />
                <span>Add Link</span>
              </>
            )}
          </Button>
        )}
      </div>

      {errorMsg && <p className="text-xs text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-900/30">{errorMsg}</p>}

      {showAddForm && (
        <form onSubmit={handleAddLink} className="p-3.5 rounded-well border border-line bg-well flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs uppercase-label font-bold block mb-1">Kind</label>
              <Select value={newKind} onChange={(e) => setNewKind(e.target.value as LinkKind)} className="text-xs">
                {LINK_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k] || k}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase-label font-bold block mb-1">Label</label>
              <Input
                placeholder="e.g. Swagger UI, Staging App"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs uppercase-label font-bold block mb-1">URL (http/https)</label>
              <Input
                type="url"
                placeholder="https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase-label font-bold block mb-1">Notes (Optional)</label>
            <Input
              placeholder="e.g. Credentials or staging instructions"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? 'Adding...' : 'Save Hub Link'}
            </Button>
          </div>
        </form>
      )}

      {links.length === 0 ? (
        <div className="text-center p-6 border border-dashed border-line rounded-well text-xs text-fg-subtle">
          No documentation or environment links stored yet for this project.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {links.map((link) => {
            const Icon = KIND_ICONS[link.kind] || Link2;
            return (
              <div
                key={link.id}
                className="p-3 rounded-well border border-line bg-well flex flex-row items-center justify-between gap-4 hover:border-line-hover transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2.5 bg-panel border border-line shadow-sm rounded-lg text-fg flex-shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-fg truncate">{link.label}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-panel border border-line text-fg-muted flex-shrink-0">
                        {KIND_LABELS[link.kind] || link.kind}
                      </span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-mono truncate"
                      title={link.url}
                    >
                      {link.url}
                    </a>
                    {link.notes && <p className="text-xs text-fg-subtle mt-1 truncate">{link.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <CopyButton 
                    textToCopy={link.url} 
                    label="Copy" 
                  />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 h-7 text-xs rounded-md bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 font-medium transition-colors"
                  >
                    <span>Open</span>
                    <ExternalLink className="size-3" />
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="flex items-center justify-center p-1.5 h-7 w-7 rounded-md text-fg-muted hover:text-rose-400 hover:bg-rose-400/10 transition-colors border border-transparent hover:border-rose-400/20"
                      title="Delete link"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
