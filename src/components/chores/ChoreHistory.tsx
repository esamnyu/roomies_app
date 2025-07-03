// src/components/chores/ChoreHistory.tsx
"use client";
import React, { useMemo } from 'react';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import type { ChoreAssignment } from '@/lib/types/types';

interface ChoreHistoryProps {
    assignments: ChoreAssignment[];
}

export const ChoreHistory: React.FC<ChoreHistoryProps> = ({ assignments }) => {
    const recentActivity = useMemo(() => {
        return assignments
            .filter(a => a.status === 'completed' || a.status === 'missed')
            .sort((a, b) => {
                const dateA = a.completed_at || a.updated_at;
                const dateB = b.completed_at || b.updated_at;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            })
            .slice(0, 10);
    }, [assignments]);

    const stats = useMemo(() => {
        const completed = assignments.filter(a => a.status === 'completed').length;
        const total = assignments.filter(a => a.status !== 'pending').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, completionRate };
    }, [assignments]);

    if (recentActivity.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="text-center space-y-2">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="text-gray-500">No activity yet</p>
                    <p className="text-sm text-gray-400">Completed tasks will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border">
            {/* Stats Header */}
            <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Completion Rate</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-primary">{stats.completionRate}%</div>
                        <span className="text-xs text-gray-500">({stats.completed}/{stats.total})</span>
                    </div>
                </div>
            </div>

            {/* Activity List */}
            <div className="divide-y max-h-96 overflow-y-auto">
                {recentActivity.map((activity) => {
                    const date = new Date(activity.completed_at || activity.updated_at);
                    const isCompleted = activity.status === 'completed';
                    
                    return (
                        <div key={activity.id} className="p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className={`mt-0.5 ${isCompleted ? 'text-green-600' : 'text-red-600'}`}>
                                    {isCompleted ? (
                                        <CheckCircle className="h-4 w-4" />
                                    ) : (
                                        <XCircle className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {activity.chore_definition?.name || 'Unknown Task'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {activity.assigned_profile?.name || 'Unassigned'} • {
                                            date.toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })
                                        }
                                    </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    isCompleted 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {isCompleted ? 'Done' : 'Missed'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};