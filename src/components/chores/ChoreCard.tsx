// src/components/chores/ChoreCard.tsx
"use client";
import React, { useMemo } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import type { ChoreAssignment } from '@/lib/types/types';

// Utility to get initials from a name
const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
};

interface ChoreCardProps {
    assignment: ChoreAssignment;
    currentUserId: string | undefined;
    onMarkComplete: (assignmentId: string) => void;
    isLoadingCompletion: boolean;
}

export const ChoreCard: React.FC<ChoreCardProps> = ({ 
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

    const bgColor = useMemo(() => {
        if (dueDate < today && assignment.status !== 'completed') {
            return 'bg-red-50 border-red-200';
        }
        if (dueDate.getTime() === today.getTime() && assignment.status !== 'completed') {
            return 'bg-yellow-50 border-yellow-200';
        }
        if (assignment.status === 'completed') {
            return 'bg-gray-100 border-gray-200 opacity-70';
        }
        return 'bg-background border';
    }, [dueDate, today, assignment.status]);

    const isAssignedToCurrentUser = assigned_user_id === currentUserId;
    const memberName = profile?.name || 'Unassigned';

    return (
        <div className={`${bgColor} p-4 rounded-lg shadow flex flex-col justify-between`}>
            <div>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-foreground">{chore?.name}</h3>
                    <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {getInitials(profile?.name)}
                    </div>
                </div>
                <div className="text-sm text-secondary-foreground">
                    <p>Assigned to: {memberName}</p>
                    <p>Due: {dueDate.toLocaleDateString()}</p>
                </div>
            </div>
            
            {assignment.status === 'pending' && isAssignedToCurrentUser && (
                <Button 
                    onClick={() => onMarkComplete(assignment.id)} 
                    disabled={isLoadingCompletion || !isCompletable} 
                    size="sm" 
                    className="mt-4 w-full" 
                    title={!isCompletable ? "Can only be marked complete within 3 days of due date." : "Mark as complete"}
                >
                    {isLoadingCompletion ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark Done
                </Button>
            )}
            
            {assignment.status === 'completed' && (
                <div className="mt-4 text-sm text-green-600 font-semibold flex items-center">
                    <CheckCircle className="h-5 w-5 mr-1" /> 
                    Done
                </div>
            )}
        </div>
    );
};