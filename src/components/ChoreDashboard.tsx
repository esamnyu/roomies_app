"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Circle, PlusCircle, RefreshCw, AlertTriangle, Loader2, ClipboardList } from 'lucide-react';
import * as api from '@/lib/api';
import type { ChoreAssignment, Household, HouseholdMember, HouseholdChore } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

interface ChoreDashboardProps {
  householdId: string;
}

const getInitials = (name?: string | null) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return parts[0][0] + parts[parts.length - 1][0];
  }
  return name.substring(0, 2);
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

  let statusText = 'Upcoming';
  let statusColor = 'bg-secondary border-input text-secondary-foreground';
  let iconColor = 'text-secondary-foreground';

  if (assignment.status === 'completed') {
    statusText = 'Completed';
    statusColor = 'bg-primary/5 border-primary/20 text-primary opacity-70';
    iconColor = 'text-primary';
  } else if (dueDate < today) {
    statusText = 'Overdue';
    statusColor = 'bg-destructive/5 border-destructive/20 text-destructive';
    iconColor = 'text-destructive';
  } else if (dueDate.getTime() === today.getTime()) {
    statusText = 'Due Today';
    statusColor = 'bg-accent/5 border-accent/20 text-accent';
    iconColor = 'text-accent';
  }

  const isAssignedToCurrentUser = assigned_user_id === currentUserId;
  const memberName = profile?.name || (assigned_user_id?.startsWith('placeholder_') ? `Placeholder ${assigned_user_id.split('_')[1]}` : 'Unassigned');

  return (
    <div className={`p-4 rounded-lg shadow-md border-l-4 ${statusColor} flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-foreground">{chore?.name || 'Unnamed Chore'}</h3>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold text-primary-foreground ${profile ? 'bg-primary' : 'bg-secondary'}`}>
            {getInitials(profile?.name)}
          </div>
        </div>
        <p className="text-xs text-secondary-foreground mb-1">Assigned to: {memberName}</p>
        <p className="text-xs text-secondary-foreground">Due: {new Date(assignment.due_date + 'T00:00:00').toLocaleDateString()}</p>
        <p className={`text-xs font-medium mt-1 ${iconColor}`}>{statusText}</p>
      </div>
      {assignment.status === 'pending' && isAssignedToCurrentUser && (
        <Button
          onClick={() => onMarkComplete(assignment.id)}
          disabled={isLoadingCompletion}
          size="sm"
          className="mt-3 w-full"
        >
          {isLoadingCompletion ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle className="h-4 w-4 mr-2"/>}
          Mark as Done
        </Button>
      )}
       {assignment.status === 'completed' && (
         <div className="mt-3 text-xs text-primary flex items-center">
            <CheckCircle className="h-4 w-4 mr-1"/> Done {assignment.completed_at ? `on ${new Date(assignment.completed_at).toLocaleDateString()}`:''}
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
            await api.addCustomChoreToHousehold(householdId, choreName.trim(), choreDescription.trim() || undefined);
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

    const inputStyles = "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Add New Chore</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="choreName" className="block text-sm font-medium text-foreground">Chore Name <span className="text-destructive">*</span></label>
                        <input type="text" id="choreName" value={choreName} onChange={(e) => setChoreName(e.target.value)}
                               className={inputStyles} />
                    </div>
                    <div>
                        <label htmlFor="choreDescription" className="block text-sm font-medium text-foreground">Description (Optional)</label>
                        <textarea id="choreDescription" value={choreDescription} onChange={(e) => setChoreDescription(e.target.value)} rows={3}
                                  className={inputStyles} />
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


export const ChoreDashboard: React.FC<ChoreDashboardProps> = ({ householdId }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [allChores, setAllChores] = useState<HouseholdChore[]>([]); // New state
  const [isLoading, setIsLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      await api.checkAndTriggerChoreRotation(householdId);
      const [choreData, householdChores] = await Promise.all([
        api.getChoreRotationUIData(householdId),
        api.getHouseholdChores(householdId) // Fetch defined chores
      ]);
      
      setAssignments(choreData.currentAssignments);
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
      await api.assignChoresForCurrentCycle(householdId);
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
    setIsLoadingCompletion(true);
    try {
      await api.markChoreAssignmentComplete(assignmentId, user.id);
      toast.success('Chore marked as complete!');
      setAssignments(prev => prev.map(a => a.id === assignmentId ? {...a, status: 'completed', completed_at: new Date().toISOString(), completed_by_user_id: user.id } : a));
    } catch (error) {
      console.error('Error marking chore complete:', error);
      toast.error('Could not mark chore as complete.');
    } finally {
        setIsLoadingCompletion(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading chores...</p></div>;
  }
  
  const activeMembersCount = members.filter(m => !m.user_id?.startsWith('placeholder_')).length;
  const targetMemberCount = household?.member_count || 0;
  const hasDefinedChores = allChores.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-background shadow rounded-lg">
        <div>
            <h2 className="text-2xl font-semibold text-foreground">Chore Command Center</h2>
            {household && (
                <p className="text-sm text-secondary-foreground">
                    Framework: {household.chore_framework || 'N/A'} | Frequency: {household.chore_frequency || 'N/A'}
                </p>
            )}
             {household?.next_chore_rotation_date && (
                <p className="text-xs text-secondary-foreground">
                    Next rotation: {new Date(household.next_chore_rotation_date + 'T00:00:00').toLocaleDateString()}
                </p>
            )}
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => setShowAddChoreModal(true)} variant="secondary" size="sm">
            <PlusCircle className="h-4 w-4 mr-2" /> Add Chore
          </Button>
          <Button onClick={handleForceRotation} disabled={isRotating} variant="secondary" size="sm" title="Manually trigger next chore rotation">
            {isRotating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Rotate/Refresh
          </Button>
        </div>
      </div>

      {activeMembersCount < targetMemberCount && targetMemberCount > 0 && (
        <div className="p-4 bg-accent/10 border-l-4 border-accent text-accent rounded-md">
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className="text-sm">
                        Waiting for {targetMemberCount - activeMembersCount} more member(s) to join.
                        Chores for placeholders will rotate to actual members once they join.
                    </p>
                </div>
            </div>
        </div>
      )}

      {!hasDefinedChores && !isLoading ? (
        <div className="text-center py-10 bg-background p-6 rounded-lg shadow">
          <ClipboardList className="mx-auto h-12 w-12 text-secondary-foreground/30" />
          <h3 className="mt-2 text-lg font-medium text-foreground">No chores have been created yet</h3>
          <p className="mt-1 text-sm text-secondary-foreground">
            Click the button below to add your first chore to the household.
          </p>
           <Button onClick={() => setShowAddChoreModal(true)} className="mt-4">
            <PlusCircle className="h-4 w-4 mr-2" /> Add a Chore
          </Button>
        </div>
      ) : hasDefinedChores && assignments.length === 0 && !isLoading ? (
        <div className="text-center py-10 bg-background p-6 rounded-lg shadow">
          <Circle className="mx-auto h-12 w-12 text-secondary-foreground/30" />
          <h3 className="mt-2 text-lg font-medium text-foreground">No chores assigned for this cycle</h3>
          <p className="mt-1 text-sm text-secondary-foreground">
            Click the "Rotate/Refresh" button to assign chores to members.
          </p>
           <Button onClick={handleForceRotation} className="mt-4" disabled={isRotating}>
            {isRotating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Assign Chores Now
          </Button>
        </div>
      ) : null}

      {hasDefinedChores && assignments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assignments.filter(a => a.status === 'pending').map(assignment => (
              <ChoreCard 
                key={assignment.id} 
                assignment={assignment} 
                currentUserId={user?.id}
                onMarkComplete={handleMarkComplete}
                isLoadingCompletion={isLoadingCompletion}
              />
            ))}
          </div>

          {assignments.filter(a => a.status === 'completed').length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">Recently Completed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {assignments.filter(a => a.status === 'completed').slice(0,4)
                  .map(assignment => (
                  <ChoreCard 
                      key={assignment.id} 
                      assignment={assignment} 
                      currentUserId={user?.id}
                      onMarkComplete={handleMarkComplete}
                      isLoadingCompletion={false}
                  />
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {showAddChoreModal && (
          <AddChoreModal
              householdId={householdId}
              onClose={() => setShowAddChoreModal(false)}
              onChoreAdded={() => {
                  fetchData(false);
              }}
          />
      )}
    </div>
  );
};