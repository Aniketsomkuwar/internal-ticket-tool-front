'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRIORITIES, PRIORITY_LABELS, TICKET_TYPES, type Priority, type TicketType } from '@/shared/index';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Alert } from '../../../../components/ui/alert';

interface SubmitFormProps {
  projects: Array<{ id: string; name: string }>;
}

export function SubmitForm({ projects }: SubmitFormProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>('bug');
  const [priority, setPriority] = useState<Priority>('P3');
  const [attachments, setAttachments] = useState<Array<{ url: string; filename: string; bytes: number; mimeType: string }>>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 5) {
      setErrorMsg('Maximum 5 attachments allowed per ticket.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`File ${file.name} is larger than the 10MB limit.`);
        setIsUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: base64Data,
              mimeType: file.type,
              filename: file.name,
            }),
          });
          if (!res.ok) throw new Error('Failed to upload attachment');
          const uploaded = await res.json();
          setAttachments((prev) => [
            ...prev,
            { url: uploaded.url, filename: file.name, bytes: file.size, mimeType: file.type },
          ]);
        } catch (err: any) {
          setErrorMsg(err.message);
        }
      };
      reader.readAsDataURL(file);
    }
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          description,
          type,
          priority,
          attachments,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit ticket');
      }

      const created = await res.json();
      router.push(`/portal/${created.reference}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-2xl rounded-surface border border-line bg-panel p-6">
      {errorMsg ? <Alert tone="error" title="Submission Error">{errorMsg}</Alert> : null}

      <div>
        <label className="block text-xs uppercase-label mb-1">Project</label>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase-label mb-1">Request Type</label>
          <Select value={type} onChange={(e) => setType(e.target.value as TicketType)}>
            {TICKET_TYPES.map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs uppercase-label mb-1">Priority</label>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase-label mb-1">Subject / Summary</label>
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief description of the problem or request"
        />
      </div>

      <div>
        <label className="block text-xs uppercase-label mb-1">Detailed Description</label>
        <textarea
          required
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe steps to reproduce, observed vs expected behavior, or exact requirement details..."
          className="w-full rounded border border-line bg-surface p-3 text-sm text-fg focus:border-line-strong focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs uppercase-label mb-1">Attachments (Screenshots / PDFs, max 5)</label>
        <div className="relative border-2 border-dashed border-line rounded-lg p-6 hover:border-indigo-500/50 hover:bg-hover transition-colors text-center group cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            disabled={isUploading || attachments.length >= 5}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg className="size-6 text-fg-muted group-hover:text-indigo-400 transition-colors" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
            <span className="text-sm font-medium text-fg">
              {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </span>
            <span className="text-xs text-fg-muted">PNG, JPG, or PDF (max. 10MB)</span>
          </div>
        </div>
        {attachments.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((a, idx) => (
              <span key={idx} className="rounded border border-line bg-well px-2 py-1 text-xs text-fg">
                {a.filename} ({(a.bytes / 1024).toFixed(0)} KB)
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-line">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={isSubmitting || isUploading}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );
}
