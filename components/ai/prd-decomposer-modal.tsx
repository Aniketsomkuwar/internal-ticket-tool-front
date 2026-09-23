'use client';

import React, { useState, useRef, useCallback } from 'react';
import { FileText, Folder, AlertTriangle } from 'lucide-react';// ─── Types ────────────────────────────────────────────────────────────────────

interface MilestoneSummary {
  id: string;
  title: string;
  phase: string;
  taskCount: number;
  riskTaskCount: number;
  deliverables?: string[];
  tasks?: Array<{
    id: string;
    title: string;
    priority: string;
    type: string;
    isRiskSpike: boolean;
    riskNotes: string;
    acceptanceCriteria: Array<{ text: string; done: boolean }>;
    blockedByIds: string[];
  }>;
}

interface BreakdownSummary {
  runId: string;
  status: string;
  milestoneCount: number;
  taskCount: number;
  riskSpikeCount: number;
  unresolvedDependencyWarnings: string[];
  infraEstimation: { apiCount: number; services: string[]; notes: string };
  milestones: MilestoneSummary[];
}

interface SseEvent {
  stage: string;
  message: string;
  summary?: BreakdownSummary;
  requiresChoice?: boolean;
  runId?: string;
}

interface Props {
  projectId: string;
  onClose: () => void;
  onCommitted: () => void;
}

// ─── Stage Config ─────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  checking: 'Checking for Existing Breakdown',
  reading: 'Reading PRD Content',
  estimating: 'Estimating Infrastructure',
  generating: 'Generating Plan with AI',
  parsing: 'Parsing AI Response',
  persisting: 'Creating Milestones & Tasks (Pass 1)',
  dependencies: 'Resolving Dependencies (Pass 2)',
  done: 'Draft Ready for Review',
  completed: 'Breakdown Complete',
  error: 'Error',
};

const PHASE_COLORS: Record<string, string> = {
  discovery: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  design: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  development: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  testing: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  deployment: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  maintenance: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PrdDecomposerModal({ projectId, onClose, onCommitted }: Props) {
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  type Screen = 'input' | 'existing' | 'running' | 'review' | 'done' | 'error';
  const [screen, setScreen] = useState<Screen>('input');
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState('');
  const [summary, setSummary] = useState<BreakdownSummary | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [error, setError] = useState('');

  const logsRef = useRef<HTMLDivElement>(null);

  const appendLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg]);
    setTimeout(() => logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight }), 50);
  }, []);

  // ─── Streaming ───────────────────────────────────────────────────────────────

  const startBreakdown = useCallback(async (mode?: 'replace' | 'append') => {
    setScreen('running');
    setLogs([]);
    setError('');
    setSummary(null);

    const formData = new FormData();
    if (mode) formData.append('mode', mode);

    if (tab === 'file' && file) {
      formData.append('file', file);
    } else if (tab === 'text' && text.trim()) {
      formData.append('content', text.trim());
    } else {
      setError('Please provide a file or paste PRD text.');
      setScreen('input');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/ai/prd-breakdown`, {
        method: 'POST',
        body: formData,
      });

      if (!res.body) throw new Error('No streaming response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw) as SseEvent;
            setCurrentStage(event.stage);
            appendLog(`[${STAGE_LABELS[event.stage] ?? event.stage}] ${event.message}`);

            if (event.stage === 'existing_run' && event.requiresChoice) {
              setScreen('existing');
              return;
            }

            if (event.stage === 'completed' && event.summary) {
              setSummary(event.summary);
              setScreen('review');
              return;
            }

            if (event.stage === 'error') {
              setError(event.message);
              setScreen('error');
              return;
            }
          } catch {
            appendLog(raw);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection error';
      setError(msg);
      setScreen('error');
    }
  }, [projectId, tab, file, text, appendLog]);

  // ─── Commit ───────────────────────────────────────────────────────────────────

  const handleCommit = useCallback(async () => {
    if (!summary) return;
    setIsCommitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/prd-breakdown/${summary.runId}/commit`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Commit failed');
      }
      setScreen('done');
      onCommitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Commit failed');
      setScreen('error');
    } finally {
      setIsCommitting(false);
    }
  }, [summary, projectId, onCommitted]);

  // ─── Discard ──────────────────────────────────────────────────────────────────

  const handleDiscard = useCallback(async () => {
    if (!summary) return;
    setIsDiscarding(true);
    try {
      await fetch(`/api/projects/${projectId}/ai/prd-breakdown/${summary.runId}`, { method: 'DELETE' });
      onClose();
    } catch {
      onClose();
    } finally {
      setIsDiscarding(false);
    }
  }, [summary, projectId, onClose]);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setTab('file'); }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-fg">Breakdown PRD</h2>
            <p className="text-xs text-fg-muted mt-0.5">AI generates milestones and tasks from your requirements document</p>
          </div>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg p-1 rounded transition-colors" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── INPUT SCREEN ─── */}
          {screen === 'input' && (
            <div className="flex flex-col gap-5">
              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-lg bg-surface border border-line w-fit">
                {(['file', 'text'] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all ${tab === t ? 'bg-panel text-fg shadow-sm border border-line' : 'text-fg-muted hover:text-fg'}`}>
                    {t === 'file' ? 'Upload File' : 'Paste Text'}
                  </button>
                ))}
              </div>

              {tab === 'file' ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-line bg-surface hover:border-line-strong'}`}
                  onClick={() => document.getElementById('prd-file-input')?.click()}
                >
                  <input id="prd-file-input" type="file" accept=".md,.txt,.pdf,.docx,.doc" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                  <div className="text-3xl">{file ? <FileText className="size-8 text-indigo-400" /> : <Folder className="size-8 text-indigo-400" />}</div>
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-fg">{file.name}</p>
                      <p className="text-xs text-fg-muted">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-fg">Drop your PRD here</p>
                      <p className="text-xs text-fg-muted mt-1">Supports PDF, DOCX, MD, TXT</p>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  rows={12}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your product requirements, user stories, or specification..."
                  className="w-full rounded-xl border border-line bg-surface p-4 text-xs text-fg resize-none font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              )}
            </div>
          )}

          {/* ── EXISTING RUN SCREEN ─── */}
          {screen === 'existing' && (
            <div className="flex flex-col gap-4 items-center text-center py-4">
              <AlertTriangle className="size-8 text-amber-500" />
              <h3 className="text-sm font-semibold text-fg">A breakdown already exists for this project</h3>
              <p className="text-xs text-fg-muted max-w-sm">
                Choose how to proceed. Replacing will archive the previous breakdown's tasks. Appending will add new tasks alongside existing ones.
              </p>
              <div className="flex gap-3 mt-2">
                <button onClick={() => startBreakdown('replace')}
                  className="px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium hover:bg-rose-500/20 transition-colors">
                  Replace Previous
                </button>
                <button onClick={() => startBreakdown('append')}
                  className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-medium hover:bg-indigo-500/20 transition-colors">
                  Append to Existing
                </button>
                <button onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-surface border border-line text-fg-muted text-xs font-medium hover:text-fg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── RUNNING SCREEN ─── */}
          {screen === 'running' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
                <p className="text-sm font-medium text-fg">
                  {STAGE_LABELS[currentStage] ?? 'Processing...'}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                {Object.entries(STAGE_LABELS).filter(([k]) => k !== 'error').map(([key, label]) => {
                  const stages = Object.keys(STAGE_LABELS);
                  const currentIdx = stages.indexOf(currentStage);
                  const thisIdx = stages.indexOf(key);
                  const isDone = thisIdx < currentIdx;
                  const isCurrent = key === currentStage;
                  return (
                    <div key={key} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 transition-colors ${isCurrent ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' : isDone ? 'text-fg-subtle' : 'text-fg-muted/40'}`}>
                      <span className="w-4 text-center">{isDone ? '✓' : isCurrent ? '⟳' : '○'}</span>
                      {label}
                    </div>
                  );
                })}
              </div>

              <div ref={logsRef} className="h-32 overflow-y-auto rounded-lg bg-surface border border-line p-3 font-mono text-[10px] text-fg-muted">
                {logs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </div>
          )}

          {/* ── REVIEW SCREEN ─── */}
          {screen === 'review' && summary && (
            <div className="flex flex-col gap-5">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Milestones', value: summary.milestoneCount },
                  { label: 'Tasks', value: summary.taskCount },
                  { label: 'Risk Spikes', value: summary.riskSpikeCount },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-line bg-surface p-3 text-center">
                    <div className="text-xl font-bold text-fg">{s.value}</div>
                    <div className="text-[11px] text-fg-muted mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Infrastructure Estimation */}
              {summary.infraEstimation.services.length > 0 && (
                <div className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-xs font-semibold text-fg mb-2">Infrastructure Estimation</p>
                  <p className="text-[11px] text-fg-muted mb-2">~{summary.infraEstimation.apiCount} custom API endpoints required</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.infraEstimation.services.map((svc) => (
                      <span key={svc} className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">{svc}</span>
                    ))}
                  </div>
                  {summary.infraEstimation.notes && (
                    <p className="text-[11px] text-fg-muted mt-2 italic">{summary.infraEstimation.notes}</p>
                  )}
                </div>
              )}

              {/* Dependency Warnings */}
              {summary.unresolvedDependencyWarnings.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-xs font-semibold text-amber-400 mb-2">Dependency Warnings ({summary.unresolvedDependencyWarnings.length})</p>
                  <div className="flex flex-col gap-1">
                    {summary.unresolvedDependencyWarnings.map((w, i) => (
                      <p key={i} className="text-[11px] text-amber-300/80">{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-fg">Generated Milestones</p>
                {summary.milestones.map((ms) => (
                  <div key={ms.id} className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-fg">{ms.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${PHASE_COLORS[ms.phase] ?? 'bg-surface text-fg-muted border-line'}`}>
                        {ms.phase}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-fg-muted">
                      <span>{ms.taskCount} tasks</span>
                      {ms.riskTaskCount > 0 && (
                        <span className="text-amber-400">{ms.riskTaskCount} risk spikes</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DONE SCREEN ─── */}
          {screen === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="text-4xl">✓</div>
              <h3 className="text-sm font-semibold text-fg">Breakdown committed to board</h3>
              <p className="text-xs text-fg-muted">All milestones and tasks are now in the Todo column.</p>
            </div>
          )}

          {/* ── ERROR SCREEN ─── */}
          {screen === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="text-4xl">✗</div>
              <h3 className="text-sm font-semibold text-rose-400">Breakdown failed</h3>
              <p className="text-xs text-fg-muted max-w-sm">{error}</p>
              <button onClick={() => setScreen('input')}
                className="px-4 py-2 rounded-lg border border-line text-xs text-fg-muted hover:text-fg transition-colors">
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line flex-shrink-0">
          {screen === 'input' && (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-line text-xs text-fg-muted hover:text-fg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => startBreakdown()}
                disabled={tab === 'file' ? !file : !text.trim()}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
              >
                Analyze PRD
              </button>
            </>
          )}

          {screen === 'review' && (
            <>
              <button onClick={handleDiscard} disabled={isDiscarding}
                className="px-4 py-2 rounded-lg border border-line text-xs text-fg-muted hover:text-fg transition-colors disabled:opacity-40">
                {isDiscarding ? 'Discarding...' : 'Discard'}
              </button>
              <button onClick={handleCommit} disabled={isCommitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
                {isCommitting ? 'Creating...' : 'Create on Board'}
              </button>
            </>
          )}

          {(screen === 'done' || screen === 'error') && (
            <button onClick={onClose}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
