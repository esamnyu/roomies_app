'use client';

import React, { useState } from 'react';
import { Plus, ListTodo, ChevronDown, ChevronUp } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { useTasks } from '@/hooks/useTasks';
import type { HouseholdMember } from '@/lib/types/types';

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
  
  console.log('Tasks in widget:', tasks);
  console.log('Display tasks:', displayTasks);

  const memberProfiles = members.map(m => ({
    id: m.user_id,
    name: m.profiles?.name || 'Unknown'
  }));

  if (isLoading) {
    return (
      <div className="bg-background rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ListTodo className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Quick Tasks</h3>
        </div>
        <div className="text-sm text-secondary-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Quick Tasks</h3>
          {pendingTasks.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {pendingTasks.length}
            </span>
          )}
        </div>
        {tasks.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-secondary-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <form onSubmit={handleAddTask} className="mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a quick task..."
            disabled={isAdding}
            className="flex-1 px-3 py-2 text-sm bg-secondary/10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-secondary-foreground/60"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || isAdding}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="text-sm text-secondary-foreground text-center py-4">
          No tasks yet. Add one above!
        </p>
      ) : (
        <div className="space-y-1 group">
          {displayTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onDelete={removeTask}
              members={memberProfiles}
            />
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

      {completedTasks.length > 0 && isExpanded && (
        <p className="text-xs text-secondary-foreground mt-3 text-center">
          Completed tasks auto-remove after 7 days
        </p>
      )}
    </div>
  );
};