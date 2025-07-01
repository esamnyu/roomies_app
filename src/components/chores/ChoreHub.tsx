// src/components/chores/ChoreHub.tsx
"use client";
import React, { useState } from 'react';
import { PlusCircle, RefreshCw, Settings, Loader2, Sparkles, Calendar, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '../AuthProvider';
import { ChoreProvider, useChoreContext } from './ChoreProvider';
import { ChoreHistory } from './ChoreHistory';
import { UpcomingRotations } from './UpcomingRotations';
import { ChoreCalendar } from './ChoreCalendar';
import { ChoreTaskCard } from './ChoreTaskCard';
import { EmptyChoreState } from './EmptyChoreState';
import { AddChoreModal } from '@/components/modals/AddChoreModal';
import { ManageChoresModal } from '@/components/modals/ManageChoresModal';

// Separate component for the dashboard content to use context
interface ChoreHubContentProps {
    householdId: string;
}

const ChoreHubContent: React.FC<ChoreHubContentProps> = ({ householdId }) => {
    const {
        assignments,
        dueSoonTasks,
        isLoading,
        isGenerating,
        isLoadingCompletion,
        isAdmin,
        handleMarkComplete,
        handleGenerateSchedule,
        refreshData,
    } = useChoreContext();

    const { user } = useAuth();
    const [showAddChoreModal, setShowAddChoreModal] = useState(false);
    const [showManageChoresModal, setShowManageChoresModal] = useState(false);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                    <p className="text-lg font-medium">Loading Chore Hub...</p>
                    <p className="text-sm text-muted-foreground">Setting up your tasks</p>
                </div>
            </div>
        );
    }

    const hasChores = assignments.length > 0;
    const hasDueTasks = dueSoonTasks.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-xl shadow-sm border border-primary/20">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="h-8 w-8 text-primary" />
                            Chore Hub
                        </h1>
                        <p className="text-muted-foreground mt-1">Keep your household running smoothly</p>
                    </div>
                    {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button 
                                onClick={() => setShowAddChoreModal(true)} 
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary/10"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Task
                            </Button>
                            <Button 
                                onClick={() => setShowManageChoresModal(true)} 
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary/10"
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Manage
                            </Button>
                            <Button 
                                onClick={handleGenerateSchedule} 
                                disabled={isGenerating}
                                size="sm"
                                className="bg-primary hover:bg-primary/90"
                            >
                                {isGenerating ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Generate Schedule
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {!hasChores && (
                <EmptyChoreState 
                    isAdmin={isAdmin}
                    onAddChore={() => setShowAddChoreModal(true)}
                />
            )}

            {/* Due Soon Tasks */}
            {hasDueTasks && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-1 bg-orange-500 rounded-full animate-pulse" />
                        <h2 className="text-xl font-semibold">
                            Tasks Due Soon
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            ({new Date(dueSoonTasks[0].due_date + 'T00:00:00').toLocaleDateString()})
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {dueSoonTasks.map(assignment => (
                            <ChoreTaskCard
                                key={assignment.id}
                                assignment={assignment}
                                currentUserId={user?.id}
                                onMarkComplete={handleMarkComplete}
                                isLoadingCompletion={!!isLoadingCompletion[assignment.id]}
                                isAdmin={isAdmin}
                                onRefresh={refreshData}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Dashboard Grid */}
            {hasChores && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold">Monthly Overview</h2>
                        </div>
                        <ChoreCalendar assignments={assignments} />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <RefreshCw className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Upcoming Rotations</h2>
                            </div>
                            <UpcomingRotations assignments={assignments} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <History className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Recent Activity</h2>
                            </div>
                            <ChoreHistory assignments={assignments} />
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showAddChoreModal && (
                <AddChoreModal
                    householdId={householdId}
                    onClose={() => setShowAddChoreModal(false)}
                    onChoreAdded={() => {
                        refreshData();
                        setShowAddChoreModal(false);
                    }}
                />
            )}
            
            {showManageChoresModal && (
                <ManageChoresModal
                    householdId={householdId}
                    onClose={() => setShowManageChoresModal(false)}
                    onChoresUpdated={() => {
                        refreshData();
                    }}
                />
            )}
        </div>
    );
};

// Main component wrapper
interface ChoreHubProps {
    householdId: string;
}

export const ChoreHub: React.FC<ChoreHubProps> = ({ householdId }) => {
    return (
        <ChoreProvider householdId={householdId}>
            <ChoreHubContent householdId={householdId} />
        </ChoreProvider>
    );
};