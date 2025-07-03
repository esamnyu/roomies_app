'use client';

import React from 'react';
import { Check, X, User } from 'lucide-react';
import type { Task } from '@/lib/types/types';

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  members?: Array<{ id: string; name: string }>;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onToggle, 
  onDelete,
  members 
}) => {
  console.log('TaskItem rendering with task:', task);
  const assignedMember = members?.find(m => m.id === task.assigned_to);
  
  return (
    <div 
      onClick={(e) => {
        console.log('Parent div clicked', e.target);
      }}
      className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
        task.completed 
          ? 'bg-secondary/20 opacity-60' 
          : 'hover:bg-secondary/10'
      }`}>
      <button
        onClick={() => {
          console.log('Toggle clicked for task:', task);
          onToggle(task.id);
        }}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
          task.completed
            ? 'bg-primary border-primary'
            : 'border-gray-400 hover:border-primary bg-white'
        }`}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {task.completed && (
          <Check className="w-3 h-3 text-white" />
        )}
      </button>
      
      <span className={`flex-1 text-sm ${
        task.completed ? 'line-through text-secondary-foreground' : 'text-foreground'
      }`}>
        {task.title || 'No title'}
      </span>
      
      {assignedMember && (
        <div className="flex items-center gap-1 text-xs text-secondary-foreground">
          <User className="w-3 h-3" />
          <span>{assignedMember.name}</span>
        </div>
      )}
      
      {task.completed && (
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
          title="Remove task"
        >
          <X className="w-3 h-3 text-destructive" />
        </button>
      )}
    </div>
  );
};