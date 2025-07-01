// src/components/chores/ChoreDashboardOptimized.tsx
"use client";
import React from 'react';
import { PlusCircle, RefreshCw, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '../AuthProvider';
import { ChoreProvider, useChoreContext } from './ChoreProvider';
import { ChoreHistory } from './ChoreHistory';
import { UpcomingRotations } from './UpcomingRotations';
import { ChoreCalendar } from './ChoreCalendar';
import { ChoreTaskCard } from './ChoreTaskCard';

// Separate component for the dashboard content to use context
const ChoreDashboardContent: React.FC = () => {
    const {
        assignments,
        dueSoonTasks,
        isLoading,
        isGenerating,
        isLoadingCompletion,
        isAdmin,
        handleMarkComplete,
        handleGenerateSchedule,
    } = useChoreContext();

    const { user } = useAuth();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3">Loading Chores...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-background shadow rounded-lg">
                <h1 className="text-2xl font-bold">Chore Command Center</h1>
                {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button 
                            onClick={() => console.log('TODO: Add chore modal')} 
                            variant="outline"
                        >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Chore
                        </Button>
                        <Button 
                            onClick={() => console.log('TODO: Manage chores modal')} 
                            variant="outline"
                        >
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Manage Chores
                        </Button>
                        <Button 
                            onClick={handleGenerateSchedule} 
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Generate 6-Month Schedule
                        </Button>
                    </div>
                )}
            </div>

            {/* Upcoming Chores */}
            {dueSoonTasks.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-3">
                        Upcoming Chores (Due: {new Date(dueSoonTasks[0].due_date + 'T00:00:00').toLocaleDateString()})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {dueSoonTasks.map(assignment => (
                            <ChoreTaskCard
                                key={assignment.id}
                                assignment={assignment}
                                currentUserId={user?.id}
                                onMarkComplete={handleMarkComplete}
                                isLoadingCompletion={!!isLoadingCompletion[assignment.id]}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <ChoreCalendar assignments={assignments} />
                </div>
                <div className="grid grid-rows-2 gap-6">
                    <UpcomingRotations assignments={assignments} />
                    <ChoreHistory assignments={assignments} />
                </div>
            </div>
        </div>
    );
};

// Main component wrapper
interface ChoreDashboardOptimizedProps {
    householdId: string;
}

export const ChoreDashboardOptimized: React.FC<ChoreDashboardOptimizedProps> = ({ householdId }) => {
    return (
        <ChoreProvider householdId={householdId}>
            <ChoreDashboardContent />
        </ChoreProvider>
    );
};