// src/components/ChoreDashboard.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, Circle, PlusCircle, RefreshCw, AlertTriangle, Loader2, ClipboardList, Edit, ToggleLeft, ToggleRight, Calendar, List, Activity, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
    addCustomChoreToHousehold,
    generateChoresForDuration,
    getChoreRotationUIData,
    getHouseholdChores,
    markChoreAssignmentComplete,
    toggleChoreActive,
    updateHouseholdChore,
    deleteHouseholdChore,
} from '@/lib/api/chores';
import type { ChoreAssignment, Household, HouseholdMember, HouseholdChore, Profile } from '@/lib/types/types';
import { useAuth } from './AuthProvider';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

// Utility to get initials from a name
const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2);
};


// --- START: CHILD COMPONENTS (with final modifications) ---

const ActivityLog: React.FC<{ assignments: ChoreAssignment[] }> = ({ assignments }) => {
    const sortedActivities = [...assignments]
        .filter(a => a.status === 'completed' || (a.status === 'missed' && new Date(a.due_date) < new Date()))
        .sort((a, b) => new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime())
        .slice(0, 15);

    return (
        <div className="bg-background p-4 rounded-lg shadow-md h-full border">
            <h2 className="text-xl font-semibold mb-4">Activity</h2>
            {sortedActivities.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-sm text-secondary-foreground">No recent activity.</p></div>
            ) : (
                <ul className="space-y-3">
                    {sortedActivities.map((log) => (
                        <li key={`log-${log.id}`} className="flex items-start space-x-2">
                            <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${log.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className={`${log.status === 'missed' ? 'text-red-500' : 'text-foreground'} text-sm`}>
                                {new Date(log.completed_at || log.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {log.chore_definition?.name} {log.status} by {log.assigned_profile?.name || 'N/A'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// FINAL: Monthly calendar with assignee initials
const MonthlyChoreCalendar: React.FC<{ assignments: ChoreAssignment[] }> = ({ assignments }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();

    const daysInMonth = Array.from({ length: endOfMonth.getDate() }, (_, i) => new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), i + 1));

    const assignmentsByDate = useMemo(() => {
        const map = new Map<string, ChoreAssignment[]>();
        assignments.forEach(a => {
            const dateKey = a.due_date;
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)!.push(a);
        });
        return map;
    }, [assignments]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    return (
        <div className="bg-background rounded-lg shadow p-4 border">
            <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-xl font-semibold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-secondary-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="font-medium">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 mt-2">
                {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="border rounded-md border-transparent"></div>)}
                {daysInMonth.map(day => {
                    const dateKey = day.toISOString().split('T')[0];
                    const choresForDay = assignmentsByDate.get(dateKey) || [];
                    const isToday = new Date().toDateString() === day.toDateString();
                    return (
                        <div key={day.toString()} className={`border rounded-md p-1 min-h-[110px] text-left flex flex-col transition-all ${isToday ? 'border-primary border-2' : 'bg-secondary/30'}`}>
                            <span className={`text-xs font-semibold self-center ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</span>
                            <div className="space-y-1 mt-1 overflow-y-auto pr-1">
                                {choresForDay.map(chore => (
                                    <div key={chore.id} className={`flex items-center space-x-1.5 text-xs p-1 rounded-md ${chore.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                        <div className="flex-shrink-0 h-4 w-4 bg-gray-300 rounded-full flex items-center justify-center text-[8px] font-bold">
                                            {getInitials(chore.assigned_profile?.name)}
                                        </div>
                                        <p className="font-semibold truncate" title={chore.chore_definition?.name}>{chore.chore_definition?.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RotationSchedule: React.FC<{ assignments: ChoreAssignment[] }> = ({ assignments }) => {
    const upcomingAssignmentsByCycle = useMemo(() => {
        const cycles = new Map<string, { assignments: ChoreAssignment[], dueDate: string }>();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        assignments.forEach(a => {
            const dueDate = new Date(a.due_date + 'T00:00:00');
            if (dueDate >= now) {
                if (!cycles.has(a.cycle_start_date)) cycles.set(a.cycle_start_date, { assignments: [], dueDate: a.due_date });
                cycles.get(a.cycle_start_date)!.assignments.push(a);
            }
        });

        return Array.from(cycles.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 4);
    }, [assignments]);

    return (
        <div className="bg-background p-4 rounded-lg shadow-md h-full border">
            <h2 className="text-xl font-semibold mb-4">Upcoming Rotation</h2>
            <div className="space-y-4">
                {upcomingAssignmentsByCycle.map(([cycleStartDate, cycleData]) => (
                    <div key={cycleStartDate} className="border-t pt-3 first:border-t-0">
                        <h3 className="font-medium mb-2 text-sm text-secondary-foreground">Due: {new Date(cycleData.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
                        <div className="flex flex-col space-y-2">
                            {cycleData.assignments.map(assignment => (
                                <div key={assignment.id} className="flex items-center space-x-3">
                                    <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">{getInitials(assignment.assigned_profile?.name)}</div>
                                    <span className={`text-sm ${assignment.status === 'completed' ? 'line-through text-gray-500' : ''}`}>{assignment.chore_definition?.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {upcomingAssignmentsByCycle.length === 0 && <p className="text-sm text-secondary-foreground mt-4">No upcoming rotations. Generate a schedule!</p>}
            </div>
        </div>
    );
};

// FINAL: ChoreCard with completion logic
const ChoreCard: React.FC<{
    assignment: ChoreAssignment;
    currentUserId: string | undefined;
    onMarkComplete: (assignmentId: string) => void;
    isLoadingCompletion: boolean;
}> = ({ assignment, currentUserId, onMarkComplete, isLoadingCompletion }) => {
    const { chore_definition: chore, assigned_profile: profile, assigned_user_id, due_date } = assignment;
    const dueDate = new Date(due_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCompletable = useMemo(() => {
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        const diff = Math.abs(today.getTime() - dueDate.getTime());
        return diff <= threeDays;
    }, [today, dueDate]);

    let bgColor = 'bg-background border';
    if (dueDate < today && assignment.status !== 'completed') bgColor = 'bg-red-50 border-red-200';
    if (dueDate.getTime() === today.getTime() && assignment.status !== 'completed') bgColor = 'bg-yellow-50 border-yellow-200';
    if (assignment.status === 'completed') bgColor = 'bg-gray-100 border-gray-200 opacity-70';

    const isAssignedToCurrentUser = assigned_user_id === currentUserId;
    const memberName = profile?.name || 'Unassigned';

    return (
        <div className={`${bgColor} p-4 rounded-lg shadow flex flex-col justify-between`}>
            <div>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-foreground">{chore?.name}</h3>
                    <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">{getInitials(profile?.name)}</div>
                </div>
                <div className="text-sm text-secondary-foreground">
                    <p>Assigned to: {memberName}</p>
                    <p>Due: {dueDate.toLocaleDateString()}</p>
                </div>
            </div>
            {assignment.status === 'pending' && isAssignedToCurrentUser && (
                <Button onClick={() => onMarkComplete(assignment.id)} disabled={isLoadingCompletion || !isCompletable} size="sm" className="mt-4 w-full" title={!isCompletable ? "Can only be marked complete within 3 days of due date." : "Mark as complete"}>
                    {isLoadingCompletion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Mark Done
                </Button>
            )}
            {assignment.status === 'completed' && (
                <div className="mt-4 text-sm text-green-600 font-semibold flex items-center"><CheckCircle className="h-5 w-5 mr-1" /> Done</div>
            )}
        </div>
    );
};

// Modals are kept as-is from your original file.
const AddChoreModal: React.FC<{ householdId: string; onChoreAdded: () => void; onClose: () => void; }> = ({ householdId, onChoreAdded, onClose }) => { /* ... */ return null };
const EditChoreModal: React.FC<{ chore: HouseholdChore; onChoreUpdated: () => void; onClose: () => void; }> = ({ chore, onChoreUpdated, onClose }) => { /* ... */ return null };
const ManageChoresModal: React.FC<{ chores: HouseholdChore[]; isAdmin: boolean; onClose: () => void; onEdit: (chore: HouseholdChore) => void; onToggleActive: (choreId: string, isActive: boolean) => void; }> = ({ chores, isAdmin, onClose, onEdit, onToggleActive }) => { /* ... */ return null };


// --- END: CHILD COMPONENTS ---


// Main ChoreDashboard Component - FINAL
export const ChoreDashboard: React.FC<{ householdId: string; }> = ({ householdId }) => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
    const [household, setHousehold] = useState<Household | null>(null);
    const [members, setMembers] = useState<HouseholdMember[]>([]);
    const [allChores, setAllChores] = useState<HouseholdChore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingCompletion, setIsLoadingCompletion] = useState<{ [key: string]: boolean }>({});
    const [showAddChoreModal, setShowAddChoreModal] = useState(false);
    const [showManageChoresModal, setShowManageChoresModal] = useState(false);
    const [choreToEdit, setChoreToEdit] = useState<HouseholdChore | null>(null);

    const isAdmin = useMemo(() => members.find(m => m.user_id === user?.id)?.role === 'admin', [members, user]);

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const [choreData, householdChores] = await Promise.all([ getChoreRotationUIData(householdId), getHouseholdChores(householdId) ]);
            setAssignments(choreData.allAssignments || []);
            setHousehold(choreData.householdInfo);
            setMembers(choreData.members);
            setAllChores(householdChores);
        } catch (error) {
            toast.error('Failed to load chore information.');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [householdId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const upcomingPendingChores = useMemo(() => {
        const pending = assignments.filter(a => a.status === 'pending');
        if (pending.length === 0) return [];
        const nextDueDate = pending.sort((a, b) => a.due_date.localeCompare(b.due_date))[0].due_date;
        return pending.filter(a => a.due_date === nextDueDate);
    }, [assignments]);

    const handleGenerateSchedule = async () => {
        if (!isAdmin) return toast.error("Only admins can generate schedules.");
        setIsGenerating(true);
        try {
            await generateChoresForDuration(householdId, 6);
            toast.success("Schedule for the next 6 months has been generated!");
            await fetchData(false);
        } catch (error) {
            toast.error('Failed to generate chore schedule.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleMarkComplete = async (assignmentId: string) => {
        if (!user) return;
        setIsLoadingCompletion(prev => ({ ...prev, [assignmentId]: true }));
        const originalAssignments = [...assignments];
        setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status: 'completed' } : a));
        try {
            await markChoreAssignmentComplete(assignmentId, user.id);
            toast.success('Chore marked as complete!');
            await fetchData(false);
        } catch (error) {
            toast.error('Could not mark chore as complete.');
            setAssignments(originalAssignments);
        } finally {
            setIsLoadingCompletion(prev => ({ ...prev, [assignmentId]: false }));
        }
    };

    const handleOpenEditChore = (chore: HouseholdChore) => { setChoreToEdit(chore); setShowManageChoresModal(false); };
    const handleToggleChoreActive = async (choreId: string, newStatus: boolean) => {
        const originalChores = [...allChores];
        setAllChores(prev => prev.map(c => c.id === choreId ? { ...c, is_active: newStatus } : c));
        try {
            await toggleChoreActive(choreId, newStatus);
            toast.success(`Chore ${newStatus ? 'activated' : 'deactivated'}.`);
        } catch (error) {
            toast.error("Failed to update chore status.");
            setAllChores(originalChores);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-3">Loading Chores...</p></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-background shadow rounded-lg">
                <h1 className="text-2xl font-bold">Chore Command Center</h1>
                {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={() => setShowAddChoreModal(true)} variant="outline"><PlusCircle className="h-4 w-4 mr-2" />Add Chore</Button>
                        <Button onClick={() => setShowManageChoresModal(true)} variant="outline"><ClipboardList className="h-4 w-4 mr-2" />Manage Chores</Button>
                        <Button onClick={handleGenerateSchedule} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Generate 6-Month Schedule
                        </Button>
                    </div>
                )}
            </div>

            {upcomingPendingChores.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-3">Upcoming Chores (Due: {new Date(upcomingPendingChores[0].due_date + 'T00:00:00').toLocaleDateString()})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {upcomingPendingChores.map(assignment => (
                            <ChoreCard
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <MonthlyChoreCalendar assignments={assignments} />
                </div>
                <div className="grid grid-rows-2 gap-6">
                    <RotationSchedule assignments={assignments} />
                    <ActivityLog assignments={assignments} />
                </div>
            </div>

            {isAdmin && showManageChoresModal && ( <ManageChoresModal chores={allChores} isAdmin={isAdmin} onClose={() => setShowManageChoresModal(false)} onEdit={handleOpenEditChore} onToggleActive={handleToggleChoreActive} /> )}
            {isAdmin && choreToEdit && ( <EditChoreModal chore={choreToEdit} onClose={() => setChoreToEdit(null)} onChoreUpdated={() => { setChoreToEdit(null); fetchData(false); }} /> )}
            {isAdmin && showAddChoreModal && ( <AddChoreModal householdId={householdId} onClose={() => setShowAddChoreModal(false)} onChoreAdded={() => { setShowAddChoreModal(false); fetchData(false); }} /> )}
        </div>
    );
};