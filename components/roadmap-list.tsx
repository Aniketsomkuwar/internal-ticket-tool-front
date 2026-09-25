'use client';

import React, { useState } from 'react';
import { Circle, PlayCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { PRIORITY_LABELS } from '@/shared/index';
import { TaskDetailModal } from './task-detail-modal';
import type { TaskItem } from '../app/(app)/board/board-client';

interface RoadmapTask {
  id: string;
  title: string;
  description?: string;
  priority: string;
  column: string;
  featureChecklist?: {
    figma?: boolean;
    development?: boolean;
    testing?: boolean;
    deployed?: boolean;
  };
}

export interface RoadmapListProps {
  roadmap?: {
    inProgress: RoadmapTask[];
    upcoming: RoadmapTask[];
    completed: RoadmapTask[];
  };
}

export function RoadmapList({ roadmap }: RoadmapListProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!roadmap) return null;

  const handleTaskClick = async (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTaskDetails(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedTaskId(null);
    setSelectedTaskDetails(null);
  };

  const renderSection = (title: string, icon: React.ReactNode, tasks: RoadmapTask[], emptyText: string) => (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-fg">
        {icon}
        {title}
      </h3>
      <div className="flex flex-col gap-3 relative max-h-[500px] overflow-y-auto pr-1">
        {tasks.length > 0 ? (
          tasks.map(t => (
            <button
              key={t.id}
              onClick={() => handleTaskClick(t.id)}
              className="p-3.5 bg-panel border border-line rounded-surface flex flex-col gap-2.5 text-left hover:border-indigo-500/50 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent group"
            >
              <div className="flex items-start justify-between gap-2.5 w-full">
                <span className="text-sm text-fg font-semibold group-hover:text-indigo-400 transition-colors leading-snug" title={t.title}>
                  {t.title}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {selectedTaskId === t.id && isLoading && (
                    <Loader2 className="size-3 animate-spin text-indigo-400" />
                  )}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-well text-fg-muted uppercase-label whitespace-nowrap">
                    {PRIORITY_LABELS[t.priority as keyof typeof PRIORITY_LABELS] || t.priority}
                  </span>
                </div>
              </div>

              {t.description ? (
                <p className="text-xs text-fg-muted line-clamp-3 leading-relaxed">
                  {t.description}
                </p>
              ) : (
                <p className="text-xs text-fg-subtle italic">
                  No description provided. Click to view details.
                </p>
              )}

              {/* Feature Checklist Status Badges */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-line/60 text-[10px] flex-wrap">
                <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-mono ${t.featureChecklist?.figma ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-well text-fg-subtle opacity-60'}`}>
                  <span>{t.featureChecklist?.figma ? '✓' : '○'}</span> Figma
                </span>
                <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-mono ${t.featureChecklist?.development ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-well text-fg-subtle opacity-60'}`}>
                  <span>{t.featureChecklist?.development ? '✓' : '○'}</span> Dev
                </span>
                <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-mono ${t.featureChecklist?.testing ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-well text-fg-subtle opacity-60'}`}>
                  <span>{t.featureChecklist?.testing ? '✓' : '○'}</span> Test
                </span>
                <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-mono ${t.featureChecklist?.deployed ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-well text-fg-subtle opacity-60'}`}>
                  <span>{t.featureChecklist?.deployed ? '✓' : '○'}</span> Live
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="p-3 bg-well rounded-well border border-line text-xs text-fg-subtle text-center">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="rounded-surface border border-line bg-panel p-5 flex flex-col md:grid md:grid-cols-3 gap-6 mt-4">
        {renderSection(
          'Currently Working On',
          <PlayCircle className="size-4 text-indigo-400" />,
          roadmap.inProgress,
          'No tasks currently in progress.'
        )}
        {renderSection(
          'Up Next',
          <Circle className="size-4 text-fg-subtle" />,
          roadmap.upcoming,
          'No upcoming tasks scheduled.'
        )}
        {renderSection(
          'Recently Completed',
          <CheckCircle2 className="size-4 text-emerald-400" />,
          roadmap.completed,
          'No tasks recently completed.'
        )}
      </div>

      {selectedTaskDetails && (
        <TaskDetailModal
          task={selectedTaskDetails}
          onClose={handleCloseModal}
          onUpdate={(updatedTask) => {
            setSelectedTaskDetails(prev => prev ? { ...prev, ...updatedTask } as TaskItem : null);
          }}
        />
      )}
    </>
  );
}
