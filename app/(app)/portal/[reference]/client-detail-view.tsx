'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../../../../components/badges';
import { Button } from '../../../../components/ui/button';
import { Alert } from '../../../../components/ui/alert';

export interface TicketDetailData {
  id: string;
  reference: string;
  projectId: string;
  projectName: string;
  clientName: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  assigneeName: string | null;
  requesterName: string;
  attachments: Array<{ url: string; filename: string; bytes: number; mimeType: string }>;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  feedbackRating: number | null;
  feedbackNps: number | null;
  feedbackComment: string | null;
  linkedTasks?: Array<{
    id: string;
    title: string;
    priority: string;
    column: string;
    dueDate: string | null;
  }>;
  comments: Array<{
    id: string;
    content: string;
    visibility: string;
    isSystemEvent: boolean;
    createdAt: string;
    author: { username: string; fullName: string; kind: string };
  }>;
}

export function ClientDetailView({ ticket, userKind }: { ticket: TicketDetailData, userKind: string }) {
  const router = useRouter();
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  // Close & Rating state
  const [rating, setRating] = useState(5);
  const [nps, setNps] = useState(10);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [reopenReason, setReopenReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  // Task Conversion state (Staff/Admin only)
  const [comingSoon, setComingSoon] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isStaffOrAdmin = userKind !== 'client';

  const handleCreateTaskClick = () => {
    setComingSoon(true);
    setSuccessMsg('Coming soon: Direct task creation from tickets will be available soon.');
    setTimeout(() => setComingSoon(false), 3000);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsCommenting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText, visibility: 'public' }),
      });
      if (!res.ok) throw new Error('Failed to post comment');
      setCommentText('');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleCloseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsClosing(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, nps, comment: feedbackComment }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to close ticket');
      }
      setShowCloseModal(false);
      setSuccessMsg('Ticket closed and rating submitted. Thank you for your feedback!');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReopening(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to reopen ticket');
      }
      setShowReopenModal(false);
      setSuccessMsg('Ticket reopened.');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {errorMsg ? <Alert tone="error" title="Error">{errorMsg}</Alert> : null}
      {successMsg ? <Alert tone="success" title="Success">{successMsg}</Alert> : null}

      {/* Header Banner */}
      <div className="rounded-surface border border-line bg-panel p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-fg">
            <span>{ticket.reference}</span>
            <span>·</span>
            <span className="text-xs text-fg-subtle">{ticket.projectName}</span>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-fg">{ticket.title}</h1>
          <p className="text-sm text-fg-muted whitespace-pre-wrap mt-3">{ticket.description}</p>
        </div>

        {ticket.attachments && ticket.attachments.length > 0 ? (
          <div className="border-t border-line pt-3">
            <p className="text-xs uppercase-label mb-2">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-line bg-well px-3 py-1.5 text-xs text-indigo-400 hover:underline"
                >
                  <Paperclip className="inline-block size-3 mr-1" /> {a.filename} ({(a.bytes / 1024).toFixed(0)} KB)
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Task Creation Bar (Internal Staff / Admin Only) */}
        {isStaffOrAdmin ? (
          <div className="rounded border border-line bg-well p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-fg">Engineering Task Conversion</p>
              <p className="text-[11px] text-fg-subtle">
                Convert this customer ticket into a structured engineering backlog task.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {comingSoon && (
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                  Coming soon
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreateTaskClick}
                className="shrink-0 opacity-70 hover:opacity-100"
                title="Coming soon"
              >
                {comingSoon ? 'Coming soon' : 'Create Task'}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Resolution Banner */}
        {ticket.status === 'resolved' ? (
          <div className="rounded border border-teal-500/30 bg-teal-500/10 p-4 flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase-label font-bold text-teal-400">Resolution Note</p>
              <p className="text-sm text-fg mt-1">{ticket.resolutionNote}</p>
            </div>
            {userKind === 'client' && (
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => setShowCloseModal(true)}>
                  Accept & Close Ticket
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowReopenModal(true)}>
                  Reopen Ticket
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {/* Linked Engineering Tasks */}
        {ticket.linkedTasks && ticket.linkedTasks.length > 0 ? (
          <div className="rounded border border-line bg-well p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase-label">Linked Engineering Tasks ({ticket.linkedTasks.length})</p>
              {isStaffOrAdmin ? (
                <a href="/kanban" className="text-xs text-indigo-400 hover:underline">
                  View Kanban Board &rarr;
                </a>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              {ticket.linkedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between text-xs py-1 border-b border-line last:border-b-0">
                  <span className="font-medium text-fg">{task.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] uppercase font-mono text-fg-muted">{task.column}</span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Closed Feedback Display */}
        {ticket.status === 'closed' && ticket.feedbackRating ? (
          <div className="rounded border border-line bg-well p-4 text-xs text-fg-muted flex flex-col gap-1">
            <p className="font-semibold text-fg">Client Feedback</p>
            <p>Rating: ⭐ {ticket.feedbackRating} / 5 · NPS Recommendation: {ticket.feedbackNps} / 10</p>
            {ticket.feedbackComment ? <p>"{ticket.feedbackComment}"</p> : null}
          </div>
        ) : null}
      </div>

      {/* Conversation Thread */}
      <div className="rounded-surface border border-line bg-panel p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase-label">Activity & Messages</h2>

        <div className="flex flex-col gap-3 divide-y divide-line">
          {ticket.comments.map((c) => (
            <div key={c.id} className="pt-3 first:pt-0">
              <div className="flex justify-between text-xs text-fg-subtle mb-1">
                <span className="font-medium text-fg">
                  {c.isSystemEvent ? 'System' : c.author.fullName || c.author.username}
                </span>
                <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-fg-muted whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>

        {ticket.status !== 'closed' ? (
          <form onSubmit={handlePostComment} className="flex flex-col gap-2 pt-4 border-t border-line">
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Post a reply or add further context..."
              className="w-full rounded border border-line bg-surface p-3 text-sm text-fg focus:outline-none focus:border-line-strong"
            />
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" size="sm" disabled={isCommenting || !commentText.trim()}>
                {isCommenting ? 'Sending...' : 'Post Reply'}
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      {/* Close & Rating Modal */}
      {showCloseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-1">Close Ticket & Rate Support</h3>
            <p className="text-xs text-fg-muted mb-4">Please rate your satisfaction with this ticket resolution.</p>

            <form onSubmit={handleCloseTicket} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase-label mb-1">Overall Satisfaction (1–5 Stars)</label>
                <div className="flex gap-3 text-lg cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setRating(star)}
                      className={star <= rating ? 'text-amber-400' : 'text-zinc-600'}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">
                  How likely are you to recommend our team? (NPS: 0–10)
                </label>
                <div className="flex justify-between border border-line rounded p-1 bg-surface">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setNps(n)}
                      className={`h-7 w-7 rounded text-xs font-mono ${
                        n === nps ? 'bg-indigo-600 text-white' : 'text-fg-muted hover:bg-hover'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Feedback Comment (Optional, max 500 chars)</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="What went well or could be improved?"
                  className="w-full rounded border border-line bg-surface p-2 text-sm text-fg"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" onClick={() => setShowCloseModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isClosing}>
                  {isClosing ? 'Closing...' : 'Close & Rate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Reopen Modal */}
      {showReopenModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-1">Reopen Ticket</h3>
            <p className="text-xs text-fg-muted mb-4">State why the solution provided did not fully resolve the request.</p>

            <form onSubmit={handleReopenTicket} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase-label mb-1">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="The problem still persists when..."
                  className="w-full rounded border border-line bg-surface p-2 text-sm text-fg"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" onClick={() => setShowReopenModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isReopening}>
                  {isReopening ? 'Reopening...' : 'Confirm Reopen'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
