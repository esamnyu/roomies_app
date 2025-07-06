import React, { useState, useEffect } from 'react';
import { Calendar, User, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { ChoreAssignment } from '@/lib/types/types';

interface ChoreInfoCardProps {
  chore: ChoreAssignment;
  isVisible: boolean;
  position: { x: number; y: number };
}

export const ChoreInfoCard: React.FC<ChoreInfoCardProps> = ({ chore, isVisible, position }) => {
  const [showDetailed, setShowDetailed] = useState(false);
  
  useEffect(() => {
    if (!isVisible) {
      setShowDetailed(false);
      return;
    }
    
    // Show detailed view after 500ms hold
    const timer = setTimeout(() => {
      setShowDetailed(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  const getStatusIcon = () => {
    switch (chore.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'missed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };
  
  const getStatusText = () => {
    switch (chore.status) {
      case 'completed':
        return 'Completed';
      case 'missed':
        return 'Missed';
      default:
        return 'Pending';
    }
  };
  
  // Simple tooltip
  if (!showDetailed) {
    return (
      <div 
        className="absolute z-50 pointer-events-none animate-in fade-in duration-200"
        style={{ 
          left: position.x, 
          top: position.y - 40,
          transform: 'translateX(-50%)'
        }}
      >
        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
          {chore.chore_definition?.name || 'Task'}
        </div>
      </div>
    );
  }
  
  // Detailed info card
  return (
    <div 
      className="absolute z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ 
        left: Math.min(Math.max(position.x - 100, 10), window.innerWidth - 210),
        top: Math.max(position.y - 150, 10),
      }}
    >
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-48">
        <div className="space-y-2">
          {/* Chore name */}
          <div className="font-semibold text-sm">
            {chore.chore_definition?.name || 'Unnamed Task'}
          </div>
          
          {/* Assigned to */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <User className="h-3 w-3" />
            <span>
              {chore.assigned_profile?.name || 'Unassigned'}
            </span>
          </div>
          
          {/* Due date */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(chore.due_date + 'T00:00:00').toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-2 text-xs">
            {getStatusIcon()}
            <span className={
              chore.status === 'completed' ? 'text-green-600' :
              chore.status === 'missed' ? 'text-red-600' :
              'text-blue-600'
            }>
              {getStatusText()}
            </span>
          </div>
          
          {/* Description if available */}
          {chore.chore_definition?.description && (
            <div className="text-xs text-gray-500 pt-1 border-t">
              {chore.chore_definition.description}
            </div>
          )}
        </div>
        
        {/* Visual indicator for drag */}
        <div className="text-center text-[10px] text-gray-400 mt-3 pt-2 border-t">
          Hold longer to reschedule
        </div>
      </div>
    </div>
  );
};