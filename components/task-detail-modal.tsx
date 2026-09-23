import React, { useEffect, useState } from 'react';
import { PriorityBadge } from './badges';
import { Button } from './ui/button';
// Removed unused lucide-react icons
import type { TaskItem } from '../app/(app)/board/board-client';

interface TaskDetailModalProps {
  task: TaskItem;
  onClose: () => void;
  onDeleted?: (taskId: string) => void;
  onUpdate?: (updatedTask: Partial<TaskItem> & { id: string }) => void;
}

const COLUMN_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  'in-progress': 'In Progress',
  testing: 'Testing',
  deployed: 'Deployed',
};

export function TaskDetailModal({ task, onClose, onDeleted, onUpdate }: TaskDetailModalProps) {
  const [subtasks, setSubtasks] = useState<TaskItem[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDeleted) onDeleted(task.id);
        else {
          onClose();
          window.location.reload();
        }
      } else {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentColumn: string) => {
    const newColumn = currentColumn === 'deployed' ? 'todo' : 'deployed';
    setSubtasks(prev => prev ? prev.map(st => st.id === subtaskId ? { ...st, column: newColumn as any } : st) : null);
    
    let diff = 0;
    if (newColumn === 'deployed' && currentColumn !== 'deployed') diff = 1;
    if (newColumn !== 'deployed' && currentColumn === 'deployed') diff = -1;
    
    if (diff !== 0 && onUpdate) {
      onUpdate({
        id: task.id,
        completedSubtaskCount: task.completedSubtaskCount + diff
      });
    }

    try {
      await fetch(`/api/tasks/${subtaskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column: newColumn, position: 0 })
      });
    } catch (e) {
      console.error(e);
      setSubtasks(prev => prev ? prev.map(st => st.id === subtaskId ? { ...st, column: currentColumn as any } : st) : null);
      if (diff !== 0 && onUpdate) {
        onUpdate({
          id: task.id,
          completedSubtaskCount: task.completedSubtaskCount
        });
      }
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // Fetch user role
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setIsClient(data.role === 'client');
      })
      .catch(console.error);

    // Fetch subtasks
    if (task.subtaskCount > 0) {
      fetch(`/api/tasks/${task.id}/subtasks`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setSubtasks(data);
        })
        .catch(console.error);
    } else {
      setSubtasks([]);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [task.id, task.subtaskCount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-surface border border-line bg-panel p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-fg">Task Details</h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <h2 className="text-xl font-bold text-fg leading-tight">{task.title}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={task.priority} />
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-well text-fg-muted uppercase-label">
              {COLUMN_LABELS[task.column] || task.column}
            </span>
            {task.isRiskSpike && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                Risk Spike
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm mb-6">
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-fg-subtle">Assignee</span>
            <span className="font-medium">{task.assigneeName || 'Unassigned'}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-fg-subtle">Due Date</span>
            <span className="font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US') : 'No date set'}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-fg-subtle">Created</span>
            <span className="font-medium">{new Date(task.createdAt).toLocaleDateString('en-US')}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-fg-subtle">Subtasks</span>
            <span className="font-medium">{task.subtaskCount}</span>
          </div>
        </div>

        <div className="mb-6 text-sm">
          <h4 className="text-fg-subtle mb-2">Description</h4>
          {task.description ? (
            <div className="text-fg-muted whitespace-pre-wrap leading-relaxed">
              {task.description}
            </div>
          ) : (
            <p className="text-fg-subtle italic">No description provided.</p>
          )}
        </div>

        {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
          <div className="mb-6 text-sm">
            <h4 className="text-fg-subtle mb-2">Acceptance Criteria</h4>
            <div className="flex flex-col gap-2">
              {task.acceptanceCriteria.map((ac, idx) => (
                <div key={idx} className="flex items-start gap-2 text-fg-muted">
                  <input 
                    type="checkbox" 
                    checked={ac.done} 
                    readOnly 
                    className="mt-1 flex-shrink-0 cursor-not-allowed"
                  />
                  <span className={ac.done ? 'line-through opacity-60' : ''}>{ac.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {task.subtaskCount > 0 && (
          <div className="mb-6 text-sm">
            <h4 className="text-fg-subtle mb-2">Subtasks</h4>
            <div className="flex flex-col gap-2">
              {!subtasks ? (
                <p className="text-xs text-fg-subtle animate-pulse">Loading subtasks...</p>
              ) : subtasks.length > 0 ? (
                subtasks.map(st => {
                  const isDone = st.column === 'deployed';
                  return (
                    <div key={st.id} className="flex items-start gap-2 text-fg-muted">
                      <input 
                        type="checkbox" 
                        checked={isDone} 
                        onChange={() => !isClient && handleToggleSubtask(st.id, st.column)}
                        readOnly={isClient}
                        disabled={isClient}
                        className={`mt-1 flex-shrink-0 ${isClient ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      />
                      <span className={isDone ? 'line-through opacity-60' : 'text-fg'}>{st.title}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-fg-subtle">No subtasks found.</p>
              )}
            </div>
          </div>
        )}

        {task.blockedByIds && task.blockedByIds.length > 0 && (
          <div className="mb-6 p-3 rounded bg-rose-500/10 border border-rose-500/30 text-sm">
            <h4 className="text-rose-400 font-semibold mb-1">Blocked By</h4>
            <p className="text-rose-300/80">
              This task is currently blocked by {task.blockedByIds.length} other task(s).
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mt-8 pt-4 border-t border-line">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-fg">Are you sure?</span>
              <button onClick={handleDelete} disabled={isDeleting} className="text-sm font-medium text-rose-500 hover:text-rose-600">
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="text-sm text-fg-muted hover:text-fg">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} className="text-sm text-rose-500 hover:text-rose-600">
              Delete Task
            </button>
          )}

          <Button 
            type="button" 
            variant="primary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
