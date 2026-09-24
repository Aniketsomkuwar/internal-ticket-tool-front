'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PriorityBadge } from '../../../components/badges';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Alert } from '../../../components/ui/alert';
import { PrdDecomposerModal } from '../../../components/ai/prd-decomposer-modal';
import { TaskDetailModal } from '../../../components/task-detail-modal';
import { useSWR } from '../../../lib/use-swr';
import { fetcher } from '../../../lib/fetcher';

export interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: string;
  column: 'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed';
  position: number;
  assigneeId: string | null;
  assigneeName: string | null;
  creatorId: string;
  parentId: string | null;
  ticketId: string | null;
  subtaskCount: number;
  completedSubtaskCount: number;
  dueDate: string | null;
  createdAt: string;
  // PRD fields
  isRiskSpike?: boolean;
  blockedByIds?: string[];
  acceptanceCriteria?: Array<{ text: string; done: boolean }>;
  type?: string;
  featureChecklist?: {
    figma?: boolean;
    development?: boolean;
    testing?: boolean;
    deployed?: boolean;
  };
}

interface BoardClientProps {
  projects: Array<{ id: string; name: string }>;
  activeProjectId: string | null;
  initialBoard: Record<'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed', TaskItem[]>;
  assignees: Array<{ id: string; name: string }>;
  currentUserId?: string;
  canWrite: boolean;
  canPrd?: boolean;
}

const COLUMNS: Array<{ key: 'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed'; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'testing', label: 'Testing' },
  { key: 'deployed', label: 'Deployed' },
];

export function BoardClient({
  projects,
  activeProjectId,
  initialBoard,
  assignees,
  currentUserId,
  canWrite,
  canPrd = false,
}: BoardClientProps) {
  const router = useRouter();
  const [currentProjectId, setCurrentProjectId] = useState(activeProjectId || 'personal');
  
  const isPersonalView = currentProjectId === 'personal';
  const url = isPersonalView ? '/api/tasks/personal-board' : `/api/projects/${currentProjectId}/board`;
  
  const { data, isValidating: isLoading, mutate } = useSWR<Record<'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed', TaskItem[]>>(
    url,
    fetcher,
    { fallbackData: currentProjectId === activeProjectId ? initialBoard : undefined }
  );

  const [board, setBoard] = useState(initialBoard);

  React.useEffect(() => {
    if (data) {
      setBoard(data);
    } else {
      setBoard(null as any);
    }
  }, [data]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // New task modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTargetColumn, setCreateTargetColumn] = useState<'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed'>('todo');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P3');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // PRD Breakdown modal
  const [showPrdModal, setShowPrdModal] = useState(false);

  // Touch move menu state for phone-width accessibility
  const [touchMenuTaskId, setTouchMenuTaskId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Drag and Drop (desktop HTML5)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    column: 'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed';
    index: number;
  } | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropIndicator(null);
  };

  const handleColumnDragOver = (
    e: React.DragEvent,
    colKey: 'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed'
  ) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    const cards = board[colKey] || [];
    setDropIndicator({ column: colKey, index: cards.length });
  };

  const handleCardDragOver = (
    e: React.DragEvent,
    colKey: 'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed',
    cardIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTaskId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const targetIdx = e.clientY < midY ? cardIndex : cardIndex + 1;
    setDropIndicator({ column: colKey, index: targetIdx });
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetColumn: 'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    const indicator = dropIndicator;
    setDraggedTaskId(null);
    setDropIndicator(null);
    if (!taskId) return;

    let targetIndex = board[targetColumn]?.length ?? 0;
    if (indicator && indicator.column === targetColumn) {
      targetIndex = indicator.index;
    }

    await executeMove(taskId, targetColumn, targetIndex);
  };

  const executeMove = async (
    taskId: string,
    targetColumn: 'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed',
    targetPosition?: number
  ) => {
    if (!canWrite) return;
    setIsMoving(true);
    setErrorMsg(null);

    // Optimistically update
    let movedTask: TaskItem | null = null;
    let fromColumn: string | null = null;
    let fromIndex: number = -1;

    const nextBoard: Record<'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed', TaskItem[]> = {
      backlog: [...(board.backlog || [])],
      todo: [...(board.todo || [])],
      'in-progress': [...(board['in-progress'] || [])],
      testing: [...(board.testing || [])],
      deployed: [...(board.deployed || [])],
    };

    for (const col of Object.keys(nextBoard) as Array<'backlog' | 'todo' | 'in-progress' | 'testing' | 'deployed'>) {
      const idx = nextBoard[col].findIndex((t) => t.id === taskId);
      if (idx !== -1 && nextBoard[col][idx]) {
        fromColumn = col;
        fromIndex = idx;
        const found = nextBoard[col][idx]!;
        movedTask = { ...found, column: targetColumn };
        nextBoard[col].splice(idx, 1);
        break;
      }
    }

    if (!movedTask) {
      setIsMoving(false);
      return;
    }

    let insertAt = targetPosition !== undefined ? targetPosition : nextBoard[targetColumn].length;
    // If reordering within the same column and moved down, adjust index because element was removed before it
    if (fromColumn === targetColumn && fromIndex !== -1 && fromIndex < insertAt) {
      insertAt = Math.max(0, insertAt - 1);
    }
    insertAt = Math.max(0, Math.min(insertAt, nextBoard[targetColumn].length));

    nextBoard[targetColumn].splice(insertAt, 0, movedTask);
    setBoard(nextBoard);
    mutate(nextBoard);

    try {
      const res = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column: targetColumn,
          position: insertAt,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Movement rejected by server.');
      }

      setSuccessMsg(`Task moved to ${targetColumn}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to move task.');
      mutate(board);
    } finally {
      setIsMoving(false);
      setTouchMenuTaskId(null);
    }
  };

  const [targetProjectId, setTargetProjectId] = useState<string>('');

  const isPersonalBoard = currentProjectId === 'personal';

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveProjectId = isPersonalBoard ? (targetProjectId || undefined) : currentProjectId;
    setIsCreating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: effectiveProjectId,
          title: newTitle,
          description: newDesc,
          priority: newPriority,
          column: createTargetColumn,
          assigneeId: isPersonalBoard ? (currentUserId || undefined) : (newAssignee || undefined),
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
          parentId: newParentId || undefined,
          isPersonal: isPersonalBoard,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Could not create task.');
      }

      const created: TaskItem = await res.json();
      setBoard((prev) => {
        const nb = { ...prev, [created.column]: [...prev[created.column], created] };
        mutate(nb);
        return nb;
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewAssignee('');
      setNewDueDate('');
      setNewParentId('');
      setSuccessMsg('Task created.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create task.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header & Project Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-fg flex items-center gap-2">
              {isPersonalBoard ? 'Personal Kanban Board' : 'Engineering Kanban Board'}
              {isLoading && (
                <span className="text-[10px] uppercase-label font-bold text-fg-subtle animate-pulse bg-well px-1.5 py-0.5 rounded">
                  Updating
                </span>
              )}
            </h1>
            {isPersonalBoard && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                My Tasks Only
              </span>
            )}
          </div>
          <p className="text-xs text-fg-muted mt-0.5">
            {isPersonalBoard
              ? 'Track tasks assigned to you across projects so nothing slips through the cracks.'
              : 'Project sprint board and engineering workflow tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={currentProjectId}
            onChange={(e) => {
              const newId = e.target.value;
              setCurrentProjectId(newId);
              window.history.pushState(null, '', `/board?projectId=${newId}`);
            }}
            className="text-xs h-8 min-w-[180px]"
          >
            <option value="personal">My Personal Board</option>
            <optgroup label="Projects">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </Select>

          {/* Hiding Breakdown PRD button for now */}
          {false && canPrd && currentProjectId && !isPersonalBoard ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrdModal(true)}
            >
              Breakdown PRD
            </Button>
          ) : null}

          {canWrite && (currentProjectId || projects.length > 0) ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCreateTargetColumn('todo');
                if (isPersonalBoard && currentUserId) {
                  setNewAssignee(currentUserId);
                }
                setShowCreateModal(true);
              }}
            >
              + New Task
            </Button>
          ) : null}
        </div>
      </div>

      {errorMsg ? <Alert tone="error" title="Movement Error">{errorMsg}</Alert> : null}
      {successMsg ? <Alert tone="success" title="Success">{successMsg}</Alert> : null}

      {/* 5-Column Board Canvas in a single row */}
      <div className="w-full overflow-x-auto pb-4 flex-1">
        <div className="grid grid-cols-5 gap-3 min-w-[1050px] xl:min-w-0 items-start min-h-[550px]">
          {!board ? (
            <div className="col-span-5 flex items-center justify-center min-h-[400px]">
              <Loader2 className="size-8 animate-spin text-fg-subtle" />
            </div>
          ) : (
            COLUMNS.map((col) => {
              const cards = board[col.key] || [];
            return (
            <div
              key={col.key}
              onDragOver={(e) => handleColumnDragOver(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
              className="flex flex-col rounded-surface border border-line bg-panel p-3 h-full min-h-[400px] transition-colors"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
                <span className="text-xs uppercase-label font-bold text-fg">
                  {col.label}
                </span>
                <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-mono text-fg-subtle">
                  {cards.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[140px]">
                {cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-8">
                    {dropIndicator?.column === col.key ? (
                      <div className="w-full h-10 border-2 border-dashed border-indigo-500/60 bg-indigo-500/10 rounded flex items-center justify-center text-[10px] text-indigo-400 font-medium">
                        Drop task here
                      </div>
                    ) : (
                      <p className="text-center text-[11px] text-fg-subtle">No tasks</p>
                    )}
                  </div>
                ) : (
                  cards.map((task, idx) => {
                    const hasSubtasks = task.subtaskCount > 0;
                    const percent = hasSubtasks ? Math.round((task.completedSubtaskCount / task.subtaskCount) * 100) : 0;
                    const isFullyDone = hasSubtasks && percent === 100 && task.column !== 'deployed';
                    const showDropBefore = dropIndicator?.column === col.key && dropIndicator?.index === idx;
                    const showDropAfter = dropIndicator?.column === col.key && dropIndicator?.index === cards.length && idx === cards.length - 1;

                    return (
                      <React.Fragment key={task.id}>
                        {showDropBefore && (
                          <div className="h-1 bg-indigo-500 rounded-full shadow-md shadow-indigo-500/50 my-1 animate-pulse transition-all" />
                        )}
                        <div
                          draggable={canWrite}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleCardDragOver(e, col.key, idx)}
                          onClick={() => setSelectedTask(task)}
                          className={`group rounded border ${isFullyDone ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-line bg-surface'} p-3 shadow-sm hover:border-line-strong cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden`}
                        >
                          {hasSubtasks && !isFullyDone && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-line-strong/30">
                              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${percent}%` }} />
                            </div>
                          )}
                          {isFullyDone && (
                            <div className="absolute top-0 right-0 bg-emerald-500/10 border-b border-l border-emerald-500/20 text-emerald-500 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-bl">
                              Ready
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-1.5 mt-1">
                            <h3 className="text-xs font-semibold text-fg leading-snug pr-8">{task.title}</h3>
                          <PriorityBadge priority={task.priority} />
                        </div>

                        {task.isRiskSpike ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium w-fit">
                            Risk Spike
                          </span>
                        ) : null}

                        {task.blockedByIds && task.blockedByIds.length > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium w-fit">
                            Blocked ({task.blockedByIds.length})
                          </span>
                        ) : null}

                        {task.description ? (
                          <p className="text-[11px] text-fg-muted line-clamp-2 leading-relaxed">{task.description}</p>
                        ) : null}

                        {task.featureChecklist ? (
                          <div className="flex items-center gap-1 text-[9px] flex-wrap pt-0.5">
                            <span className={`px-1 py-0.5 rounded font-mono flex items-center gap-0.5 ${task.featureChecklist.figma ? 'text-purple-400 bg-purple-500/15 border border-purple-500/30' : 'text-fg-subtle bg-well opacity-50'}`}>
                              {task.featureChecklist.figma ? '✓' : '○'} Figma
                            </span>
                            <span className={`px-1 py-0.5 rounded font-mono flex items-center gap-0.5 ${task.featureChecklist.development ? 'text-blue-400 bg-blue-500/15 border border-blue-500/30' : 'text-fg-subtle bg-well opacity-50'}`}>
                              {task.featureChecklist.development ? '✓' : '○'} Dev
                            </span>
                            <span className={`px-1 py-0.5 rounded font-mono flex items-center gap-0.5 ${task.featureChecklist.testing ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30' : 'text-fg-subtle bg-well opacity-50'}`}>
                              {task.featureChecklist.testing ? '✓' : '○'} Test
                            </span>
                            <span className={`px-1 py-0.5 rounded font-mono flex items-center gap-0.5 ${task.featureChecklist.deployed ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30' : 'text-fg-subtle bg-well opacity-50'}`}>
                              {task.featureChecklist.deployed ? '✓' : '○'} Live
                            </span>
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between text-[10px] text-fg-subtle pt-1 border-t border-line/50">
                          <span>{task.assigneeName || 'Unassigned'}</span>
                          {task.subtaskCount > 0 ? (
                            <span className="font-mono bg-well px-1.5 py-0.5 rounded border border-line">
                              {task.completedSubtaskCount}/{task.subtaskCount} Subtasks
                            </span>
                          ) : task.acceptanceCriteria && task.acceptanceCriteria.length > 0 ? (
                            <span className="font-mono">
                              {task.acceptanceCriteria.filter((c) => c.done).length}/{task.acceptanceCriteria.length} AC
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-line/40">
                          {touchMenuTaskId === task.id ? (
                            <div className="flex flex-wrap gap-1 w-full bg-well p-1 rounded">
                              {COLUMNS.filter((c) => c.key !== task.column).map((target) => (
                                <button
                                  key={target.key}
                                  type="button"
                                  disabled={isMoving}
                                  onClick={(e) => { e.stopPropagation(); executeMove(task.id, target.key); }}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-surface hover:bg-hover text-fg border border-line"
                                >
                                  → {target.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setTouchMenuTaskId(null); }}
                                className="text-[10px] px-1 text-fg-subtle hover:text-fg"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setTouchMenuTaskId(task.id); }}
                              className="text-[10px] text-indigo-400 hover:underline"
                            >
                              Move task...
                            </button>
                          )}
                        </div>
                      </div>
                      {showDropAfter && (
                        <div className="h-1 bg-indigo-500 rounded-full shadow-md shadow-indigo-500/50 my-1 animate-pulse transition-all" />
                      )}
                    </React.Fragment>
                  );
                })
                )}
              </div>

              {/* Bottom Quick Add */}
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => {
                    setCreateTargetColumn(col.key);
                    if (isPersonalBoard && currentUserId) {
                      setNewAssignee(currentUserId);
                    }
                    setShowCreateModal(true);
                  }}
                  className="mt-2 text-center text-xs text-fg-subtle hover:text-fg py-1 border-t border-line/40"
                >
                  + Add task
                </button>
              ) : null}
            </div>
          );
        })
        )}
        </div>
      </div>

      {/* Create Task / Subtask Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-surface border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-fg mb-1">
              {newParentId ? 'Create Subtask' : isPersonalBoard ? 'Create Personal Task' : 'Create Engineering Task'}
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              {newParentId
                ? 'Adds a nested subtask.'
                : isPersonalBoard
                  ? 'Creates a task assigned directly to you so you never lose track.'
                  : 'Adds a new task to the project Kanban board.'}
            </p>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-3">
              {isPersonalBoard && (
                <div>
                  <label className="block text-xs uppercase-label mb-1">
                    Associated Project <span className="text-fg-subtle font-normal lowercase">(optional)</span>
                  </label>
                  <Select
                    value={targetProjectId}
                    onChange={(e) => setTargetProjectId(e.target.value)}
                  >
                    <option value="">None (General / Personal Task)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase-label mb-1">Title</label>
                <Input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Task title or user story"
                />
              </div>

              <div>
                <label className="block text-xs uppercase-label mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Technical requirements, steps or notes..."
                  className="w-full rounded border border-line bg-surface p-2.5 text-xs text-fg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase-label mb-1">Priority</label>
                  <Select value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}>
                    <option value="P1">P1 Critical / Urgent</option>
                    <option value="P2">P2 High</option>
                    <option value="P3">P3 Medium</option>
                    <option value="P4">P4 Low</option>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs uppercase-label">Assignee</label>
                    {currentUserId && (
                      <button
                        type="button"
                        onClick={() => setNewAssignee(currentUserId)}
                        className={`text-[11px] hover:underline font-medium ${newAssignee === currentUserId ? 'text-indigo-400 font-semibold' : 'text-fg-subtle hover:text-indigo-400'}`}
                      >
                        Assign to myself
                      </button>
                    )}
                  </div>
                  <Select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}>
                    <option value="">Unassigned</option>
                    {currentUserId && (
                      <option value={currentUserId}>
                        Assign to myself ({assignees.find((a) => a.id === currentUserId)?.name || 'Me'})
                      </option>
                    )}
                    {assignees
                      .filter((a) => a.id !== currentUserId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase-label mb-1">Column</label>
                  <Select
                    value={createTargetColumn}
                    onChange={(e) => setCreateTargetColumn(e.target.value as any)}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="testing">Testing</option>
                    <option value="deployed">Deployed</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs uppercase-label mb-1">Due Date</label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewParentId('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* PRD Modal */}
      {showPrdModal && currentProjectId ? (
        <PrdDecomposerModal
          projectId={currentProjectId}
          onClose={() => setShowPrdModal(false)}
          onCommitted={() => {
            setShowPrdModal(false);
            router.refresh();
          }}
        />
      ) : null}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDeleted={(deletedId) => {
            setSelectedTask(null);
            setBoard((prev) => {
              const newBoard = { ...prev };
              for (const col of Object.keys(newBoard) as Array<keyof typeof newBoard>) {
                newBoard[col] = newBoard[col].filter((t) => t.id !== deletedId);
              }
              mutate(newBoard);
              return newBoard;
            });
            setSuccessMsg('Task deleted successfully');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
          onUpdate={(updatedTask) => {
            setSelectedTask(prev => prev ? { ...prev, ...updatedTask } as TaskItem : null);
            setBoard(prev => {
              const nb = { ...prev };
              for (const col of Object.keys(nb) as Array<keyof typeof nb>) {
                nb[col] = nb[col].map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } as TaskItem : t);
              }
              mutate(nb);
              return nb;
            });
          }}
        />
      )}
    </div>
  );
}
