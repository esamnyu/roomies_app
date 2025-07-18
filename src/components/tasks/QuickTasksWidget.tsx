'use client';

import React, { useState } from 'react';
import { Plus, ListTodo, ChevronDown, ChevronUp, CheckSquare } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { SwipeableTaskItem } from './SwipeableTaskItem';
import { useTasks } from '@/hooks/useTasks';
import type { HouseholdMember } from '@/lib/types/types';
import { useIsMobile, useIsTouchDevice } from '@/hooks/useMediaQuery';

interface QuickTasksWidgetProps {
  householdId: string;
  currentUserId: string;
  members: HouseholdMember[];
}

export const QuickTasksWidget: React.FC<QuickTasksWidgetProps> = ({
  householdId,
  currentUserId,
  members
}) => {
  const { tasks, isLoading, addTask, toggleTask, removeTask } = useTasks(householdId);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsAdding(true);
    try {
      await addTask(newTaskTitle.trim(), currentUserId);
      setNewTaskTitle('');
    } finally {
      setIsAdding(false);
    }
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const displayTasks = isExpanded ? tasks : tasks.slice(0, 3);

  const memberProfiles = members.map(m => ({
    id: m.user_id,
    name: m.profiles?.name || 'Unknown'
  }));

  if (isLoading) {
    return (
      <div className="bg-background rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Today's Tasks</h3>
        </div>
        <div className="text-sm text-secondary-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">{isMobile ? "Today's Tasks" : "Quick Tasks"}</h3>
          {pendingTasks.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {pendingTasks.length}
            </span>
          )}
        </div>
        {tasks.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-secondary-foreground hover:text-foreground transition-colors p-1"
            aria-label={isExpanded ? 'Collapse tasks' : 'Expand tasks'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <form onSubmit={handleAddTask} className="mb-2">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add task..."
            disabled={isAdding}
            className={`flex-1 px-2 py-1.5 text-sm bg-secondary/10 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent placeholder:text-secondary-foreground/60 ${isMobile ? 'min-h-[44px]' : ''}`}
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || isAdding}
            className="px-2 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="text-xs text-secondary-foreground text-center py-3">
          No tasks yet
        </p>
      ) : (
        <div className="space-y-0.5 group">
          {displayTasks.map(task => (
            isTouch ? (
              <SwipeableTaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={removeTask}
                members={memberProfiles}
              />
            ) : (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={removeTask}
                members={memberProfiles}
              />
            )
          ))}
          
          {!isExpanded && tasks.length > 3 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-sm text-secondary-foreground hover:text-foreground py-2 transition-colors"
            >
              Show {tasks.length - 3} more task{tasks.length - 3 !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {completedTasks.length > 0 && isExpanded && isTouch && (
        <p className="text-xs text-secondary-foreground text-center mt-2">
          Swipe to manage tasks
        </p>
      )}
    </div>
  );
};