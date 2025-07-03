// src/components/chores/RotationSchedule.tsx
"use client";
import React, { useMemo } from 'react';
import type { ChoreAssignment } from '@/lib/types/types';

// Utility to get initials from a name
const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
};

interface RotationScheduleProps {
    assignments: ChoreAssignment[];
}

export const RotationSchedule: React.FC<RotationScheduleProps> = ({ assignments }) => {
    const upcomingAssignmentsByCycle = useMemo(() => {
        const cycles = new Map<string, { assignments: ChoreAssignment[], dueDate: string }>();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        assignments.forEach(a => {
            const dueDate = new Date(a.due_date + 'T00:00:00');
            if (dueDate >= now) {
                if (!cycles.has(a.cycle_start_date)) {
                    cycles.set(a.cycle_start_date, { assignments: [], dueDate: a.due_date });
                }
                cycles.get(a.cycle_start_date)!.assignments.push(a);
            }
        });

        return Array.from(cycles.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(0, 4);
    }, [assignments]);

    return (
        <div className="bg-background p-4 rounded-lg shadow-md h-full border">
            <h2 className="text-xl font-semibold mb-4">Upcoming Rotation</h2>
            <div className="space-y-4">
                {upcomingAssignmentsByCycle.map(([cycleStartDate, cycleData]) => (
                    <div key={cycleStartDate} className="border-t pt-3 first:border-t-0">
                        <h3 className="font-medium mb-2 text-sm text-secondary-foreground">
                            Due: {new Date(cycleData.dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                            })}
                        </h3>
                        <div className="flex flex-col space-y-2">
                            {cycleData.assignments.map(assignment => (
                                <div key={assignment.id} className="flex items-center space-x-3">
                                    <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                        {getInitials(assignment.assigned_profile?.name)}
                                    </div>
                                    <span className={`text-sm ${
                                        assignment.status === 'completed' ? 'line-through text-gray-500' : ''
                                    }`}>
                                        {assignment.chore_definition?.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {upcomingAssignmentsByCycle.length === 0 && (
                    <p className="text-sm text-secondary-foreground mt-4">
                        No upcoming rotations. Generate a schedule!
                    </p>
                )}
            </div>
        </div>
    );
};