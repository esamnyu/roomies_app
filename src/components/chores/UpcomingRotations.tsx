// src/components/chores/UpcomingRotations.tsx
"use client";
import React, { useMemo } from 'react';
import { Calendar, Users, UserPlus, ChevronRight } from 'lucide-react';
import type { ChoreAssignment } from '@/lib/types/types';

// Utility to get initials
const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
};

interface UpcomingRotationsProps {
    assignments: ChoreAssignment[];
}

export const UpcomingRotations: React.FC<UpcomingRotationsProps> = ({ assignments }) => {
    const upcomingRotations = useMemo(() => {
        const cycles = new Map<string, { assignments: ChoreAssignment[], dueDate: string }>();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        assignments.forEach(a => {
            const dueDate = new Date(a.due_date + 'T00:00:00');
            if (dueDate >= now && a.status === 'pending') {
                const key = `${a.cycle_start_date}-${a.due_date}`;
                if (!cycles.has(key)) {
                    cycles.set(key, { assignments: [], dueDate: a.due_date });
                }
                cycles.get(key)!.assignments.push(a);
            }
        });

        return Array.from(cycles.entries())
            .sort((a, b) => a[1].dueDate.localeCompare(b[1].dueDate))
            .slice(0, 4);
    }, [assignments]);

    if (upcomingRotations.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-center space-y-2">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="text-gray-500">No upcoming rotations</p>
                    <p className="text-sm text-gray-400">Generate a schedule to see future assignments</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="space-y-0 divide-y">
                {upcomingRotations.map(([key, rotation], index) => {
                    const dueDate = new Date(rotation.dueDate + 'T00:00:00');
                    const isNextRotation = index === 0;
                    
                    return (
                        <div 
                            key={key} 
                            className={`p-4 ${isNextRotation ? 'bg-primary/5' : 'hover:bg-gray-50'} transition-colors`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-900">
                                        {dueDate.toLocaleDateString('en-US', { 
                                            weekday: 'short',
                                            month: 'short', 
                                            day: 'numeric' 
                                        })}
                                    </span>
                                </div>
                                {isNextRotation && (
                                    <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">
                                        Next Up
                                    </span>
                                )}
                            </div>
                            
                            <div className="space-y-2">
                                {rotation.assignments.map(assignment => {
                                    const isPlaceholder = !assignment.assigned_user_id || !assignment.assigned_profile;
                                    
                                    return (
                                        <div 
                                            key={assignment.id} 
                                            className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                                        >
                                            {isPlaceholder ? (
                                                <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <UserPlus className="h-4 w-4 text-gray-500" />
                                                </div>
                                            ) : (
                                                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                                                    {getInitials(assignment.assigned_profile?.name)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {assignment.chore_definition?.name}
                                                </p>
                                                {isPlaceholder ? (
                                                    <p className="text-xs text-gray-500">Awaiting assignment</p>
                                                ) : (
                                                    <p className="text-xs text-gray-600">
                                                        {assignment.assigned_profile?.name}
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* View All Link */}
            <div className="p-3 bg-gray-50 border-t">
                <button className="w-full text-sm text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1">
                    View Full Schedule
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};