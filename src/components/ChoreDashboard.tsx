// src/components/ChoreDashboard.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, Circle, PlusCircle, RefreshCw, AlertTriangle, Loader2, ClipboardList, Edit, ToggleLeft, ToggleRight, Calendar, List, Activity } from 'lucide-react';
import {
  addCustomChoreToHousehold,
  isChoreRotationDue,
  triggerChoreRotation,
  getChoreRotationUIData,
  getHouseholdChores,
  markChoreAssignmentComplete,
  toggleChoreActive,
  updateHouseholdChore
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

// --- START: CHILD COMPONENTS ---

const ActivityLog: React.FC<{ assignments: ChoreAssignment[] }> = ({ assignments }) => {
    const sortedActivities = [...assignments]
        .filter(a => a.status === 'completed' || (a.status === 'missed' && new Date(a.due_date) < new Date()))
        .sort((a, b) => new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime())
        .slice(0, 15);

    return (
        <div className="bg-white p-4 rounded-2xl shadow-md h-full">
            <h2 className="text-xl font-semibold mb-4">Activity</h2>
            {sortedActivities.length === 0 ? (
                 <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500">No recent activity.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {sortedActivities.map((log) => (
                        <li key={`log-${log.id}`} className="flex items-start space-x-2">
                            <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${log.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className={`${log.status === 'missed' ? 'text-red-500' : 'text-gray-800'} text-sm`}>
                                {new Date(log.completed_at || log.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {log.chore_definition?.name} {log.status === 'completed' ? 'completed' : 'missed'} by {log.assigned_profile?.name || 'N/A'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const CalendarDay: React.FC<{ day: Date; chores: ChoreAssignment[]; isToday?: boolean; }> = ({ day, chores, isToday }) => {
  return (
      <div className={`border bg-gray-50 p-2 rounded-lg flex flex-col min-h-[100px] ${isToday ? 'border-blue-500 border-2' : ''}`}>
          <h3 className={`text-sm font-medium mb-1 text-center ${isToday ? 'text-blue-600' : ''}`}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</h3>
          <div className="space-y-1 flex-grow">
              {chores.map(chore => (
                  <div key={chore.id} className="flex items-center justify-between bg-white p-1 rounded-lg shadow-inner text-xs">
                      <span className="truncate">{chore.chore_definition?.name}</span>
                      <div className="ml-1 flex-shrink-0 h-5 w-5 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold">
                          {getInitials(chore.assigned_profile?.name)}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );
};

const WeeklyChoreCalendar: React.FC<{ assignments: ChoreAssignment[] }> = ({ assignments }) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)); // Monday as start of the week

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return day;
    });

    return (
        <div className="bg-white p-4 rounded-2xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Weekly Calendar</h2>
            <div className="grid grid-cols-7 gap-2 text-center">
                {weekDays.map((day, idx) => {
                    const dayString = day.toISOString().split('T')[0];
                    const choresForDay = assignments.filter(a => a.due_date === dayString);
                    const isToday = day.toDateString() === new Date().toDateString();
                    return <CalendarDay key={idx} day={day} chores={choresForDay} isToday={isToday}/>;
                })}
            </div>
        </div>
    );
};

const RotationSchedule: React.FC<{ household: Household | null; members: HouseholdMember[]; chores: HouseholdChore[] }> = ({ household, members, chores }) => {
    const schedule = useMemo(() => {
        if (!household || members.length === 0 || chores.length === 0 || !household.chore_frequency || !household.next_chore_rotation_date) return [];

        const activeChores = chores.filter(c => c.is_active).sort((a,b) => (a.default_order || 0) - (b.default_order || 0));
        const activeMembers = members.filter(m => m.profiles && !m.user_id.startsWith('placeholder_'));
        if (activeMembers.length === 0 || activeChores.length === 0) return [];

        let assigneeIndex = household.chore_current_assignee_index ?? 0;
        let cycleStart = new Date(household.next_chore_rotation_date + 'T00:00:00');

        const getNextDate = (d: Date) => {
            const next = new Date(d);
            switch (household.chore_frequency) {
                case 'Weekly': next.setDate(d.getDate() + 7); break;
                case 'Bi-weekly': next.setDate(d.getDate() + 14); break;
                case 'Monthly': next.setMonth(d.getMonth() + 1); break;
                default: next.setDate(d.getDate() + 7);
            }
            return next;
        }

        return Array.from({ length: 3 }).map(() => {
            const periodEnd = getNextDate(cycleStart);
            periodEnd.setDate(periodEnd.getDate() - 1);
            const periodLabel = `${cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

            const currentAssignments = activeChores.map((chore, index) => {
                const memberIndex = (assigneeIndex + index) % activeMembers.length;
                return {
                    choreName: chore.name,
                    profile: activeMembers[memberIndex]?.profiles
                };
            });
            
            assigneeIndex = (assigneeIndex + 1) % activeMembers.length;
            cycleStart = getNextDate(cycleStart);

            return { label: periodLabel, assignments: currentAssignments };
        });
    }, [household, members, chores]);

    return (
        <div className="bg-white p-4 rounded-2xl shadow-md h-full">
            <h2 className="text-xl font-semibold mb-4">Rotation Schedule</h2>
            <div className="space-y-4">
                {schedule.map((week, idx) => (
                    <div key={idx} className="border-t pt-3">
                        <h3 className="font-medium mb-2 text-sm">{week.label}</h3>
                        <div className="flex flex-col space-y-2">
                            {week.assignments.map((assignment, i) => (
                                <div key={i} className="flex items-center space-x-3">
                                    <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold">
                                        {getInitials(assignment.profile?.name)}
                                    </div>
                                    <span className="text-sm">{assignment.choreName}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const ChoreCard: React.FC<{
  assignment: ChoreAssignment;
  currentUserId: string | undefined;
  onMarkComplete: (assignmentId: string) => void;
  isLoadingCompletion: boolean;
}> = ({ assignment, currentUserId, onMarkComplete, isLoadingCompletion }) => {
  const { chore_definition: chore, assigned_profile: profile, assigned_user_id } = assignment;
  const dueDate = new Date(assignment.due_date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let bgColor = 'bg-green-50';
  if (dueDate < today && assignment.status !== 'completed') bgColor = 'bg-red-50';
  if (dueDate.getTime() === today.getTime() && assignment.status !== 'completed') bgColor = 'bg-yellow-50';
  if(assignment.status === 'completed') bgColor = 'bg-gray-100 opacity-70';


  const isAssignedToCurrentUser = assigned_user_id === currentUserId;
  const memberName = profile?.name || (assigned_user_id?.startsWith('placeholder_') ? `Placeholder ${assigned_user_id.split('_')[1]}` : 'Unassigned');

  return (
    <div className={`${bgColor} p-5 rounded-2xl shadow-lg flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{chore?.name}</span>
          </div>
          <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold">
            {getInitials(profile?.name)}
          </div>
        </div>
        <div className="mb-3">
          <span className="block text-sm text-gray-600">Assigned to: {memberName}</span>
          <span className="block text-sm text-gray-600">Due: {new Date(assignment.due_date + 'T00:00:00').toLocaleDateString()}</span>
        </div>
      </div>
      {assignment.status === 'pending' && isAssignedToCurrentUser && (
        <Button
          onClick={() => onMarkComplete(assignment.id)}
          disabled={isLoadingCompletion}
          size="sm"
          className="mt-4 w-full"
        >
          {isLoadingCompletion ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle className="h-4 w-4 mr-2"/>}
          Mark Done
        </Button>
      )}
       {assignment.status === 'completed' && (
         <div className="mt-4 text-sm text-green-600 flex items-center">
            <CheckCircle className="h-5 w-5 mr-1"/> Done
         </div>
       )}
    </div>
  );
};


const AddChoreModal: React.FC<{
    householdId: string;
    onChoreAdded: () => void;
    onClose: () => void;
}> = ({ householdId, onChoreAdded, onClose }) => {
    const [choreName, setChoreName] = useState('');
    const [choreDescription, setChoreDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!choreName.trim()) {
            toast.error("Chore name is required.");
            return;
        }
        setIsLoading(true);
        try {
            await addCustomChoreToHousehold(householdId, choreName.trim(), choreDescription.trim() || undefined);
            toast.success(`Chore "${choreName}" added! It will be included in the next rotation.`);
            onChoreAdded();
            onClose();
        } catch (error) {
            console.error("Failed to add custom chore", error);
            toast.error("Could not add chore. " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsLoading(false);
        }
    };

    const textareaStyles = "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm resize-none";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Add New Chore</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="choreName" className="block text-sm font-medium text-foreground">Chore Name <span className="text-destructive">*</span></label>
                        <Input type="text" id="choreName" value={choreName} onChange={(e) => setChoreName(e.target.value)}
                               className="mt-1" placeholder="e.g., Clean the kitchen"/>
                    </div>
                    <div>
                        <label htmlFor="choreDescription" className="block text-sm font-medium text-foreground">Description (Optional)</label>
                        <textarea id="choreDescription" value={choreDescription} onChange={(e) => setChoreDescription(e.target.value)} rows={3}
                                  className={textareaStyles} placeholder="e.g., Wipe counters, clean sink, sweep floor"/>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" onClick={onClose} disabled={isLoading} variant="secondary">
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={isLoading || !choreName.trim()}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Chore"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const EditChoreModal: React.FC<{
    chore: HouseholdChore;
    onChoreUpdated: () => void;
    onClose: () => void;
}> = ({ chore, onChoreUpdated, onClose }) => {
    const [choreName, setChoreName] = useState(chore.name);
    const [choreDescription, setChoreDescription] = useState(chore.description || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!choreName.trim()) {
            toast.error("Chore name is required.");
            return;
        }
        setIsLoading(true);
        try {
            await updateHouseholdChore(chore.id, {
                name: choreName.trim(),
                description: choreDescription.trim() || undefined
            });
            toast.success("Chore updated!");
            onChoreUpdated();
        } catch (error) {
            toast.error("Could not update chore. " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsLoading(false);
        }
    };
    
    const textareaStyles = "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm resize-none";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Edit Chore</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground">Chore Name <span className="text-destructive">*</span></label>
                        <Input type="text" value={choreName} onChange={(e) => setChoreName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground">Description (Optional)</label>
                        <textarea value={choreDescription} onChange={(e) => setChoreDescription(e.target.value)} rows={3} className={textareaStyles} />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button onClick={onClose} disabled={isLoading} variant="secondary">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !choreName.trim()}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ManageChoresModal: React.FC<{
    chores: HouseholdChore[];
    isAdmin: boolean;
    onClose: () => void;
    onEdit: (chore: HouseholdChore) => void;
    onToggleActive: (choreId: string, isActive: boolean) => void;
}> = ({ chores, isAdmin, onClose, onEdit, onToggleActive }) => {
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Manage All Chores</h3>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {chores.map(chore => (
                        <div key={chore.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                            <div>
                                <p className={`font-medium ${chore.is_active ? 'text-foreground' : 'text-secondary-foreground line-through'}`}>{chore.name}</p>
                                <p className="text-xs text-secondary-foreground">{chore.description}</p>
                            </div>
                            {isAdmin && (
                                <div className="flex items-center space-x-3 flex-shrink-0">
                                    <button onClick={() => onToggleActive(chore.id, !chore.is_active)} title={chore.is_active ? 'Deactivate' : 'Activate'}>
                                        {chore.is_active ? <ToggleRight className="h-6 w-6 text-primary"/> : <ToggleLeft className="h-6 w-6 text-secondary-foreground"/>}
                                    </button>
                                     <Button variant="outline" size="sm" onClick={() => onEdit(chore)}>
                                        <Edit className="h-4 w-4"/>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                 <div className="mt-6 flex justify-end">
                    <Button onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    )
};


// --- END: CHILD COMPONENTS ---

// Main ChoreDashboard Component
export const ChoreDashboard: React.FC<{ householdId: string; }> = ({ householdId }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [allChores, setAllChores] = useState<HouseholdChore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false);

  // Modal states
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [showManageChoresModal, setShowManageChoresModal] = useState(false);
  const [choreToEdit, setChoreToEdit] = useState<HouseholdChore | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    try {
      const [choreData, householdChores, allAssignmentsData] = await Promise.all([
        getChoreRotationUIData(householdId),
        getHouseholdChores(householdId),
        supabase.from('chore_assignments')
                .select('*, chore_definition:household_chore_id (*), assigned_profile:profiles (id, name, avatar_url)')
                .eq('household_id', householdId)
      ]);
      
      setAssignments(allAssignmentsData.data || []);
      setHousehold(choreData.householdInfo);
      setMembers(choreData.members);
      setAllChores(householdChores);

    } catch (error) {
      console.error('Error fetching chore data:', error);
      toast.error('Failed to load chore information. '  + (error instanceof Error ? error.message : ""));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleForceRotation = async () => {
    setIsRotating(true);
    try {
      await triggerChoreRotation(householdId);
      toast.success("Chore rotation processed!");
      await fetchData(false);
    } catch (error) {
      console.error('Error forcing chore rotation:', error);
      toast.error('Failed to process chore rotation.');
    } finally {
      setIsRotating(false);
    }
  };
  
  const handleMarkComplete = async (assignmentId: string) => {
    if (!user) return;

    const originalAssignments = [...assignments];
    const newAssignments = originalAssignments.map(a => 
      a.id === assignmentId 
        ? { ...a, status: 'completed' as const, completed_at: new Date().toISOString(), completed_by_user_id: user.id } 
        : a
    );
    setAssignments(newAssignments);
    setIsLoadingCompletion(true);

    try {
      const updatedAssignment = await markChoreAssignmentComplete(assignmentId, user.id);
      if(updatedAssignment){
          setAssignments(prev => prev.map(a => a.id === assignmentId ? updatedAssignment : a));
      }
      toast.success('Chore marked as complete!');
    } catch (error) {
      console.error('Error marking chore complete:', error);
      toast.error('Could not mark chore as complete. Reverting.');
      setAssignments(originalAssignments);
    } finally {
        setIsLoadingCompletion(false);
    }
  };

  const handleOpenEditChore = (chore: HouseholdChore) => {
      setChoreToEdit(chore);
      setShowManageChoresModal(false);
  }

  const handleToggleChoreActive = async (choreId: string, newStatus: boolean) => {
    const originalChores = [...allChores];
    const newChores = originalChores.map(c => 
        c.id === choreId ? { ...c, is_active: newStatus } : c
    );
    setAllChores(newChores);

    try {
        await toggleChoreActive(choreId, newStatus);
        toast.success(`Chore ${newStatus ? 'activated' : 'deactivated'}.`);
    } catch (error) {
        toast.error("Failed to update chore status. Reverting.");
        setAllChores(originalChores);
        console.error("Failed to toggle chore active status:", error);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading chores...</p></div>;
  }
  
  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin';
  const currentCycleAssignments = assignments.filter(a => a.cycle_start_date === household?.last_chore_rotation_date);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-background shadow rounded-lg">
        <h2 className="text-3xl font-semibold">Chore Command Center</h2>
        <div className="flex items-center space-x-3">
            {isAdmin && (
              <Button onClick={() => setShowAddChoreModal(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" /> New Chore
              </Button>
            )}
        </div>
      </div>
      
      {/* Cards View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentCycleAssignments.map(assignment => (
          <ChoreCard 
            key={assignment.id} 
            assignment={assignment} 
            currentUserId={user?.id}
            onMarkComplete={handleMarkComplete}
            isLoadingCompletion={isLoadingCompletion}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1">
              <RotationSchedule household={household} members={members} chores={allChores} />
          </div>
          <div className="lg:col-span-3">
              <WeeklyChoreCalendar assignments={assignments} />
          </div>
          <div className="lg:col-span-1">
              <ActivityLog assignments={assignments} />
          </div>
      </div>

      {/* Recently Completed Section */}
      <div>
        <h3 className="text-2xl font-semibold mb-4">Recently Completed</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {assignments
                .filter(a => a.status === 'completed')
                .sort((a,b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
                .slice(0, 4)
                .map(assignment => (
                    <ChoreCard 
                        key={`completed-${assignment.id}`} 
                        assignment={assignment} 
                        currentUserId={user?.id}
                        onMarkComplete={handleMarkComplete}
                        isLoadingCompletion={isLoadingCompletion}
                    />
                ))
            }
        </div>
      </div>

      {/* Modals */}
      {isAdmin && showManageChoresModal && (
        <ManageChoresModal 
            chores={allChores}
            isAdmin={isAdmin}
            onClose={() => setShowManageChoresModal(false)}
            onEdit={handleOpenEditChore}
            onToggleActive={handleToggleChoreActive}
        />
      )}
      {isAdmin && choreToEdit && (
        <EditChoreModal 
            chore={choreToEdit}
            onClose={() => setChoreToEdit(null)}
            onChoreUpdated={() => {
                setChoreToEdit(null);
                fetchData(false);
            }}
        />
      )}
      {isAdmin && showAddChoreModal && (
          <AddChoreModal
              householdId={householdId}
              onClose={() => setShowAddChoreModal(false)}
              onChoreAdded={() => {
                  setShowAddChoreModal(false);
                  fetchData(false);
              }}
          />
      )}
    </div>
  );
};