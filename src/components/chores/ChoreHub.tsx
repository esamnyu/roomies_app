// src/components/chores/ChoreHub.tsx
"use client";
import React, { useState } from 'react';
import { PlusCircle, RefreshCw, Settings, Loader2, Sparkles, Calendar, History, Users, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { useAuth } from '../AuthProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { ChoreProvider, useChoreContext } from './ChoreProvider';
import { ChoreHistory } from './ChoreHistory';
import { UpcomingRotations } from './UpcomingRotations';
import { ChoreCalendar } from './ChoreCalendar';
import { DraggableChoreCalendar } from './DraggableChoreCalendar';
import { ChoreTaskCard } from './ChoreTaskCard';
import { EmptyChoreState } from './EmptyChoreState';
import { AddChoreModal } from '@/components/modals/AddChoreModal';
import { ManageChoresModal } from '@/components/modals/ManageChoresModal';
import { QuickTasksWidget } from '@/components/tasks/QuickTasksWidget';
import { ChoreParticipationMatrix } from './ChoreParticipationMatrix';

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
        members,
        handleMarkComplete,
        handleGenerateSchedule,
        refreshData,
        updateChoreDate,
    } = useChoreContext();

    const { user } = useAuth();
    const [showAddChoreModal, setShowAddChoreModal] = useState(false);
    const [showManageChoresModal, setShowManageChoresModal] = useState(false);
    const [showParticipationModal, setShowParticipationModal] = useState(false);
    const [useDraggableCalendar, setUseDraggableCalendar] = useState(true);
    const isMobile = useIsMobile();

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
            {/* Quick Tasks Widget */}
            {user && (
                <QuickTasksWidget
                    householdId={householdId}
                    currentUserId={user.id}
                    members={members}
                />
            )}

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
                    {isAdmin ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button 
                                onClick={() => setShowAddChoreModal(true)} 
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary/10"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                {isMobile ? 'Add' : 'Add Task'}
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
                                onClick={() => setShowParticipationModal(true)} 
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary/10"
                            >
                                <Users className="h-4 w-4 mr-2" />
                                {isMobile ? 'Participate' : 'Participation'}
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
                                {isMobile ? 'Generate' : 'Generate Schedule'}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Button 
                                onClick={() => setShowParticipationModal(true)} 
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary/10"
                            >
                                <Users className="h-4 w-4 mr-2" />
                                My Participation
                            </Button>
                            <div className="text-sm text-muted-foreground">
                                <p>Contact admin for more options</p>
                            </div>
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
                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
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

            {/* Main Dashboard Grid - Responsive Layout */}
            {hasChores && (
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3'}`}>
                    <div className={`${isMobile ? '' : 'xl:col-span-2'} space-y-4`}>
                        <div className="flex items-center gap-2 mb-2 justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Monthly Overview</h2>
                            </div>
                            {!isMobile && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setUseDraggableCalendar(!useDraggableCalendar)}
                                    className="text-xs"
                                >
                                    {useDraggableCalendar ? 'Simple View' : 'Drag View'}
                                </Button>
                            )}
                        </div>
                        {useDraggableCalendar ? (
                            <DraggableChoreCalendar 
                                assignments={assignments} 
                                onChoreMove={isAdmin ? updateChoreDate : undefined}
                            />
                        ) : (
                            <ChoreCalendar assignments={assignments} />
                        )}
                    </div>
                    {!isMobile && (
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
                    )}
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
            
            {/* Participation Modal */}
            {showParticipationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-semibold text-foreground">Chore Participation</h2>
                            <button
                                onClick={() => setShowParticipationModal(false)}
                                className="text-secondary-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                            <ChoreParticipationMatrix
                                householdId={householdId}
                                currentUserId={user?.id || ''}
                                isAdmin={isAdmin}
                            />
                        </div>
                    </div>
                </div>
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