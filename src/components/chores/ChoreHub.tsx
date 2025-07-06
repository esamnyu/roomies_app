// src/components/chores/ChoreHub.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { PlusCircle, RefreshCw, Settings, Loader2, Calendar, History, Users, X, MoreVertical, ListChecks } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResizableChoreLayout } from './ResizableChoreLayout';

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
    const [useDraggableCalendar, setUseDraggableCalendar] = useState(true);
    const [panelSizes, setPanelSizes] = useState<[number, number]>([65, 35]);
    const isMobile = useIsMobile();

    useEffect(() => {
        // Load saved panel sizes from localStorage
        const savedSizes = localStorage.getItem('chore-panel-sizes');
        if (savedSizes) {
            try {
                const sizes = JSON.parse(savedSizes);
                setPanelSizes(sizes);
            } catch (e) {
                // Invalid data, use defaults
            }
        }
    }, []);

    const handlePanelResize = (sizes: number[]) => {
        const newSizes: [number, number] = [sizes[0], sizes[1]];
        setPanelSizes(newSizes);
        localStorage.setItem('chore-panel-sizes', JSON.stringify(newSizes));
    };

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
            <div className="bg-background border border-border rounded-lg p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">
                            Chore Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage and track household tasks</p>
                    </div>
                    {isAdmin ? (
                        <div className="flex items-center gap-2">
                            <Button 
                                onClick={() => setShowAddChoreModal(true)} 
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Chore
                            </Button>
                            <Button 
                                onClick={handleGenerateSchedule} 
                                disabled={isGenerating}
                                variant="outline"
                                size="sm"
                            >
                                {isGenerating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                {!isMobile && <span className="ml-2">Generate</span>}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">More options</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setShowManageChoresModal(true)}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Manage Chores
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            <p>Contact admin for more options</p>
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
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                            {(() => {
                                const today = new Date().toISOString().split('T')[0];
                                const taskDate = dueSoonTasks[0].due_date;
                                return taskDate === today ? 'Tasks Due Today' : 'Next Due Tasks';
                            })()}
                        </h2>
                        <span className="text-sm text-orange-700 dark:text-orange-300">
                            {new Date(dueSoonTasks[0].due_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
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

            {/* Main Dashboard - Responsive Layout */}
            {hasChores && (
                isMobile ? (
                    // Mobile layout - stacked vertically
                    <div className="space-y-6">
                        <div className="bg-background border border-border rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Monthly Overview</h2>
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
                    </div>
                ) : (
                    // Desktop layout - resizable panels
                    <ResizableChoreLayout
                        defaultSizes={panelSizes}
                        onLayout={handlePanelResize}
                        mainContent={
                            <div className="bg-background border border-border rounded-lg p-6 h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold">Monthly Overview</h2>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setPanelSizes([65, 35]);
                                                localStorage.removeItem('chore-panel-sizes');
                                            }}
                                            className="text-xs"
                                            title="Reset layout to default sizes"
                                        >
                                            Reset Layout
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setUseDraggableCalendar(!useDraggableCalendar)}
                                            className="text-xs"
                                        >
                                            {useDraggableCalendar ? 'Simple View' : 'Drag View'}
                                        </Button>
                                    </div>
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
                        }
                        sidebarContent={
                            <div className="space-y-4">
                                {/* Quick Tasks Widget for desktop */}
                                {user && (
                                    <QuickTasksWidget
                                        householdId={householdId}
                                        currentUserId={user.id}
                                        members={members}
                                    />
                                )}
                                <div className="bg-background border border-border rounded-lg p-4">
                                    <h2 className="text-base font-semibold mb-3">Upcoming Rotations</h2>
                                    <UpcomingRotations assignments={assignments} />
                                </div>
                                <div className="bg-background border border-border rounded-lg p-4">
                                    <h2 className="text-base font-semibold mb-3">Recent Activity</h2>
                                    <ChoreHistory assignments={assignments} />
                                </div>
                            </div>
                        }
                    />
                )
            )}

            {/* Quick Tasks Widget for mobile - after calendar */}
            {isMobile && user && hasChores && (
                <QuickTasksWidget
                    householdId={householdId}
                    currentUserId={user.id}
                    members={members}
                />
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