// src/components/chores/ActivityLog.tsx
"use client";
import React, { useMemo } from 'react';
import type { ChoreAssignment } from '@/lib/types/types';

// Utility to get initials from a name
const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
};

interface ActivityLogProps {
    assignments: ChoreAssignment[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ assignments }) => {
    const sortedActivities = useMemo(() => {
        return [...assignments]
            .filter(a => a.status === 'completed' || (a.status === 'missed' && new Date(a.due_date) < new Date()))
            .sort((a, b) => new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime())
            .slice(0, 15);
    }, [assignments]);

    return (
        <div className="bg-background p-4 rounded-lg shadow-md h-full border">
            <h2 className="text-xl font-semibold mb-4">Activity</h2>
            {sortedActivities.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-secondary-foreground">No recent activity.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {sortedActivities.map((log) => (
                        <li key={`log-${log.id}`} className="flex items-start space-x-2">
                            <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                                log.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            <span className={`${
                                log.status === 'missed' ? 'text-red-500' : 'text-foreground'
                            } text-sm`}>
                                {new Date(log.completed_at || log.due_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                })} – {log.chore_definition?.name} {log.status} by {log.assigned_profile?.name || 'N/A'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};