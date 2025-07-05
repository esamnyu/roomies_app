'use client';

import React, { useState } from 'react';
import { Check, X, User, Trash2 } from 'lucide-react';
import type { Task } from '@/lib/types/types';
import { useIsMobile, useIsTouchDevice } from '@/hooks/useMediaQuery';

interface SwipeableTaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  members?: Array<{ id: string; name: string }>;
}

export const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({ 
  task, 
  onToggle, 
  onDelete,
  members 
}) => {
  const assignedMember = members?.find(m => m.id === task.assigned_to);
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);
  
  const minSwipeDistance = 50;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && task.completed) {
      setSwiped('left');
      setTimeout(() => {
        onDelete(task.id);
      }, 300);
    } else if (isRightSwipe && !task.completed) {
      setSwiped('right');
      setTimeout(() => {
        onToggle(task.id);
      }, 300);
    } else {
      setSwiped(null);
    }
  };
  
  const translateX = swiped === 'left' ? '-100%' : swiped === 'right' ? '100%' : '0';
  
  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-0 flex items-center">
        <div className="flex-1 bg-green-500 h-full flex items-center px-4">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 bg-red-500 h-full flex items-center justify-end px-4">
          <Trash2 className="w-5 h-5 text-white" />
        </div>
      </div>
      
      {/* Main task item */}
      <div 
        className={`relative flex items-center gap-3 py-2 px-3 rounded-lg transition-all bg-background ${
          task.completed 
            ? 'bg-secondary/20 opacity-60' 
            : 'hover:bg-secondary/10'
        }`}
        style={{
          transform: `translateX(${translateX})`,
          transition: swiped ? 'transform 0.3s ease-out' : 'none'
        }}
        onTouchStart={isTouch ? handleTouchStart : undefined}
        onTouchMove={isTouch ? handleTouchMove : undefined}
        onTouchEnd={isTouch ? handleTouchEnd : undefined}
      >
        <button
          onClick={() => onToggle(task.id)}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
            task.completed
              ? 'bg-primary border-primary'
              : 'border-gray-400 hover:border-primary bg-white'
          } ${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`}
          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {task.completed && (
            <Check className={`text-white ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
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
        
        {task.completed && !isTouch && (
          <button
            onClick={() => onDelete(task.id)}
            className={`${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity p-1 hover:bg-destructive/10 rounded`}
            title="Remove task"
          >
            <X className="w-3 h-3 text-destructive" />
          </button>
        )}
      </div>
    </div>
  );
};