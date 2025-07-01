// src/components/chores/ChoreProvider.tsx
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../AuthProvider';
import {
    getChoreRotationUIData,
    getHouseholdChores,
    markChoreAssignmentComplete,
    generateChoresForDuration,
} from '@/lib/api/chores';
import { snoozeChore } from '@/lib/api/choreManagement';
import type { ChoreAssignment, Household, HouseholdMember, HouseholdChore } from '@/lib/types/types';

interface ChoreContextType {
    // Data
    assignments: ChoreAssignment[];
    household: Household | null;
    members: HouseholdMember[];
    allChores: HouseholdChore[];
    dueSoonTasks: ChoreAssignment[];
    
    // Loading states
    isLoading: boolean;
    isGenerating: boolean;
    isLoadingCompletion: { [key: string]: boolean };
    
    // Computed values
    isAdmin: boolean;
    
    // Actions
    handleMarkComplete: (assignmentId: string) => Promise<void>;
    handleGenerateSchedule: () => Promise<void>;
    refreshData: (showLoading?: boolean) => Promise<void>;
    setIsLoadingCompletion: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
    updateChoreDate: (choreId: string, newDate: string) => Promise<void>;
}

const ChoreContext = createContext<ChoreContextType | undefined>(undefined);

export const useChoreContext = () => {
    const context = useContext(ChoreContext);
    if (!context) {
        throw new Error('useChoreContext must be used within a ChoreProvider');
    }
    return context;
};

interface ChoreProviderProps {
    householdId: string;
    children: React.ReactNode;
}

export const ChoreProvider: React.FC<ChoreProviderProps> = ({ householdId, children }) => {
    const { user } = useAuth();
    
    // State
    const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
    const [household, setHousehold] = useState<Household | null>(null);
    const [members, setMembers] = useState<HouseholdMember[]>([]);
    const [allChores, setAllChores] = useState<HouseholdChore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingCompletion, setIsLoadingCompletion] = useState<{ [key: string]: boolean }>({});

    // Computed values
    const isAdmin = useMemo(() => 
        members.find(m => m.user_id === user?.id)?.role === 'admin', 
        [members, user]
    );

    const dueSoonTasks = useMemo(() => {
        const pending = assignments.filter(a => a.status === 'pending');
        if (pending.length === 0) return [];
        
        // Find the earliest due date more efficiently
        let nextDueDate = pending[0].due_date;
        for (let i = 1; i < pending.length; i++) {
            if (pending[i].due_date < nextDueDate) {
                nextDueDate = pending[i].due_date;
            }
        }
        
        return pending.filter(a => a.due_date === nextDueDate);
    }, [assignments]);

    // Data fetching
    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            // Batch API calls for better performance
            const [choreData, householdChores] = await Promise.all([
                getChoreRotationUIData(householdId), 
                getHouseholdChores(householdId)
            ]);
            
            setAssignments(choreData.allAssignments || []);
            setHousehold(choreData.householdInfo);
            setMembers(choreData.members);
            setAllChores(householdChores);
        } catch (error) {
            console.error('Failed to load chore data:', error);
            toast.error('Failed to load chore information.');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [householdId]);

    // Actions
    const handleMarkComplete = useCallback(async (assignmentId: string) => {
        if (!user) return;
        setIsLoadingCompletion(prev => ({ ...prev, [assignmentId]: true }));
        const originalAssignments = [...assignments];
        
        // Optimistic update with completion timestamp
        setAssignments(prev => prev.map(a => 
            a.id === assignmentId 
                ? { ...a, status: 'completed' as const, completed_at: new Date().toISOString() } 
                : a
        ));
        
        try {
            await markChoreAssignmentComplete(assignmentId, user.id);
            toast.success('Chore marked as complete!');
        } catch (error) {
            toast.error('Could not mark chore as complete.');
            setAssignments(originalAssignments);
        } finally {
            setIsLoadingCompletion(prev => ({ ...prev, [assignmentId]: false }));
        }
    }, [user, assignments]);

    const handleGenerateSchedule = useCallback(async () => {
        if (!isAdmin) {
            toast.error("Only admins can generate schedules.");
            return;
        }
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
    }, [isAdmin, householdId, fetchData]);

    const updateChoreDate = useCallback(async (choreId: string, newDate: string) => {
        if (!isAdmin) {
            toast.error("Only admins can reschedule chores.");
            return;
        }
        
        // Find the chore being moved
        const choreToMove = assignments.find(a => a.id === choreId);
        if (!choreToMove) {
            toast.error('Chore not found');
            return;
        }
        
        // Check if it's actually a different date
        if (choreToMove.due_date === newDate) {
            return; // No change needed
        }
        
        const originalAssignments = [...assignments];
        
        // Optimistic update - properly update the chore's date
        setAssignments(prev => prev.map(a => 
            a.id === choreId ? { ...a, due_date: newDate } : a
        ));
        
        try {
            const result = await snoozeChore(choreId, newDate, 'Rescheduled via drag and drop');
            if (result.success) {
                toast.success('Chore rescheduled successfully!');
                // Don't refresh immediately to avoid flickering
                // The optimistic update should be sufficient
            } else {
                toast.error(result.message || 'Failed to reschedule chore.');
                setAssignments(originalAssignments);
            }
        } catch (error: any) {
            console.error('Error updating chore date:', error);
            // Check for specific error messages
            if (error?.message?.includes('future')) {
                toast.error('Chores can only be rescheduled to future dates');
            } else if (error?.message?.includes('permission')) {
                toast.error('You do not have permission to reschedule this chore');
            } else {
                toast.error('Failed to reschedule chore. Please try again.');
            }
            setAssignments(originalAssignments);
        }
    }, [isAdmin, assignments]);

    // Effects
    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    const contextValue = useMemo(() => ({
        // Data
        assignments,
        household,
        members,
        allChores,
        dueSoonTasks,
        
        // Loading states
        isLoading,
        isGenerating,
        isLoadingCompletion,
        
        // Computed values
        isAdmin,
        
        // Actions
        handleMarkComplete,
        handleGenerateSchedule,
        refreshData: fetchData,
        setIsLoadingCompletion,
        updateChoreDate,
    }), [
        assignments,
        household,
        members,
        allChores,
        dueSoonTasks,
        isLoading,
        isGenerating,
        isLoadingCompletion,
        isAdmin,
        handleMarkComplete,
        handleGenerateSchedule,
        fetchData,
        updateChoreDate,
    ]);

    return (
        <ChoreContext.Provider value={contextValue}>
            {children}
        </ChoreContext.Provider>
    );
};