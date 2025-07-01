// src/components/chores/ChoreTaskCard.tsx
"use client";
import React, { useMemo } from 'react';
import { CheckCircle, Loader2, Clock, AlertCircle, User, UserPlus, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ChoreAssignment } from '@/lib/types/types';

// Utility to get initials from a name
const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
};

interface ChoreTaskCardProps {
    assignment: ChoreAssignment;
    currentUserId: string | undefined;
    onMarkComplete: (assignmentId: string) => void;
    isLoadingCompletion: boolean;
}

export const ChoreTaskCard: React.FC<ChoreTaskCardProps> = ({ 
    assignment, 
    currentUserId, 
    onMarkComplete, 
    isLoadingCompletion 
}) => {
    const { chore_definition: chore, assigned_profile: profile, assigned_user_id, due_date } = assignment;
    
    const dueDate = useMemo(() => new Date(due_date + 'T00:00:00'), [due_date]);
    const today = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);

    const isCompletable = useMemo(() => {
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        const diff = Math.abs(today.getTime() - dueDate.getTime());
        return diff <= threeDays;
    }, [today, dueDate]);

    const status = useMemo(() => {
        if (assignment.status === 'completed') return 'completed';
        if (dueDate < today) return 'overdue';
        if (dueDate.getTime() === today.getTime()) return 'due-today';
        return 'upcoming';
    }, [dueDate, today, assignment.status]);

    const cardStyles = useMemo(() => {
        const baseStyles = "relative overflow-hidden rounded-xl shadow-sm transition-all duration-200 hover:shadow-md";
        switch (status) {
            case 'overdue':
                return `${baseStyles} bg-red-50 border-2 border-red-200 hover:border-red-300`;
            case 'due-today':
                return `${baseStyles} bg-amber-50 border-2 border-amber-200 hover:border-amber-300`;
            case 'completed':
                return `${baseStyles} bg-gray-50 border border-gray-200 opacity-75`;
            default:
                return `${baseStyles} bg-white border border-gray-200 hover:border-gray-300`;
        }
    }, [status]);

    const statusIcon = useMemo(() => {
        switch (status) {
            case 'overdue':
                return <AlertCircle className="h-4 w-4 text-red-600" />;
            case 'due-today':
                return <Clock className="h-4 w-4 text-amber-600 animate-pulse" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            default:
                return <Calendar className="h-4 w-4 text-gray-500" />;
        }
    }, [status]);

    const statusText = useMemo(() => {
        switch (status) {
            case 'overdue':
                return 'Overdue';
            case 'due-today':
                return 'Due Today';
            case 'completed':
                return 'Completed';
            default:
                return `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
    }, [status, dueDate]);

    const isAssignedToCurrentUser = assigned_user_id === currentUserId;
    const isPlaceholder = !assigned_user_id || !profile;

    return (
        <div className={cardStyles}>
            {/* Status indicator bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
                status === 'overdue' ? 'bg-red-500' :
                status === 'due-today' ? 'bg-amber-500' :
                status === 'completed' ? 'bg-green-500' :
                'bg-gray-300'
            }`} />

            <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                            {chore?.name || 'Unnamed Task'}
                        </h3>
                        {chore?.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                {chore.description}
                            </p>
                        )}
                    </div>
                    {isPlaceholder ? (
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-gray-500" />
                        </div>
                    ) : (
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold text-primary">
                            {getInitials(profile?.name)}
                        </div>
                    )}
                </div>

                {/* Assignment Info */}
                <div className="space-y-2">
                    {isPlaceholder ? (
                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                            <UserPlus className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Awaiting member assignment</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>{profile?.name}</span>
                            {isAssignedToCurrentUser && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">You</span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                        {statusIcon}
                        <span className={
                            status === 'overdue' ? 'text-red-600 font-medium' :
                            status === 'due-today' ? 'text-amber-600 font-medium' :
                            status === 'completed' ? 'text-green-600' :
                            'text-gray-600'
                        }>
                            {statusText}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                {assignment.status === 'pending' && isAssignedToCurrentUser && !isPlaceholder && (
                    <Button 
                        onClick={() => onMarkComplete(assignment.id)} 
                        disabled={isLoadingCompletion || !isCompletable} 
                        size="sm" 
                        className="w-full mt-3" 
                        variant={status === 'overdue' || status === 'due-today' ? 'default' : 'outline'}
                    >
                        {isLoadingCompletion ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Marking complete...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Complete
                            </>
                        )}
                    </Button>
                )}

                {!isCompletable && assignment.status === 'pending' && isAssignedToCurrentUser && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                        Can only mark complete within 3 days of due date
                    </p>
                )}

                {/* Quick Actions (future implementation) */}
                {false && assignment.status === 'pending' && (
                    <div className="flex items-center justify-between pt-2 border-t">
                        <button className="text-xs text-gray-500 hover:text-primary flex items-center gap-1">
                            Reassign
                            <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};