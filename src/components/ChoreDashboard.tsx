// src/components/ChoreDashboard.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Circle, PlusCircle, RefreshCw, Calendar, Users, Settings, AlertTriangle, Loader2, Edit3, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import type { ChoreAssignment, Household, HouseholdMember, HouseholdChore } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { toast } from 'react-hot-toast';

interface ChoreDashboardProps {
  householdId: string;
}

// Helper to get initials for avatar
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
  const dueDate = new Date(assignment.due_date + 'T00:00:00'); // Ensure it's parsed as local date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let statusText = 'Upcoming';
  let statusColor = 'bg-blue-50 border-blue-300 text-blue-700';
  let iconColor = 'text-blue-500';

  if (assignment.status === 'completed') {
    statusText = 'Completed';
    statusColor = 'bg-green-50 border-green-300 text-green-700 opacity-70';
    iconColor = 'text-green-500';
  } else if (dueDate < today) {
    statusText = 'Overdue';
    statusColor = 'bg-red-50 border-red-300 text-red-700';
    iconColor = 'text-red-500';
  } else if (dueDate.getTime() === today.getTime()) {
    statusText = 'Due Today';
    statusColor = 'bg-yellow-50 border-yellow-400 text-yellow-700';
    iconColor = 'text-yellow-500';
  }

  const isAssignedToCurrentUser = assigned_user_id === currentUserId;
  const memberName = profile?.name || (assigned_user_id?.startsWith('placeholder_') ? `Placeholder ${assigned_user_id.split('_')[1]}` : 'Unassigned');

  return (
    <div className={`p-4 rounded-lg shadow-md border-l-4 ${statusColor} flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800">{chore?.name || 'Unnamed Chore'}</h3>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold text-white ${profile ? 'bg-indigo-500' : 'bg-gray-400'}`}>
            {getInitials(profile?.name)}
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-1">Assigned to: {memberName}</p>
        <p className="text-xs text-gray-500">Due: {new Date(assignment.due_date + 'T00:00:00').toLocaleDateString()}</p>
        <p className={`text-xs font-medium mt-1 ${iconColor}`}>{statusText}</p>
      </div>
      {assignment.status === 'pending' && isAssignedToCurrentUser && (
        <button
          onClick={() => onMarkComplete(assignment.id)}
          disabled={isLoadingCompletion}
          className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center disabled:opacity-50"
        >
          {isLoadingCompletion ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle className="h-4 w-4 mr-2"/>}
          Mark as Done
        </button>
      )}
       {assignment.status === 'completed' && (
         <div className="mt-3 text-xs text-green-600 flex items-center">
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
            onChoreAdded(); // This might trigger a re-fetch or re-assignment logic
            onClose();
        } catch (error) {
            console.error("Failed to add custom chore", error);
            toast.error("Could not add chore. " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Add New Chore</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="choreName" className="block text-sm font-medium text-gray-700">Chore Name <span className="text-red-500">*</span></label>
                        <input type="text" id="choreName" value={choreName} onChange={(e) => setChoreName(e.target.value)}
                               className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="choreDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                        <textarea id="choreDescription" value={choreDescription} onChange={(e) => setChoreDescription(e.target.value)} rows={3}
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading || !choreName.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Chore"}
                    </button>
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // Check for rotation first, this might re-assign and then we fetch the new state
      await api.checkAndTriggerChoreRotation(householdId);
      
      const data = await api.getChoreRotationUIData(householdId);
      setAssignments(data.currentAssignments);
      setHousehold(data.householdInfo);
      setMembers(data.members);
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
      await api.assignChoresForCurrentCycle(householdId); // Force re-assignment for next cycle logic
      toast.success("Chore rotation processed!");
      await fetchData(false); // Re-fetch data without page loading spinner
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
      // Optimistic update or re-fetch
      setAssignments(prev => prev.map(a => a.id === assignmentId ? {...a, status: 'completed', completed_at: new Date().toISOString(), completed_by_user_id: user.id } : a));
      // await fetchData(false); // Or re-fetch for full consistency
    } catch (error) {
      console.error('Error marking chore complete:', error);
      toast.error('Could not mark chore as complete.');
    } finally {
        setIsLoadingCompletion(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /> <p className="ml-2">Loading chores...</p></div>;
  }
  
  const activeMembersCount = members.filter(m => !m.user_id?.startsWith('placeholder_')).length;
  const targetMemberCount = household?.member_count || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-white shadow rounded-lg">
        <div>
            <h2 className="text-2xl font-semibold text-gray-800">Chore Command Center</h2>
            {household && (
                <p className="text-sm text-gray-500">
                    Framework: {household.chore_framework || 'N/A'} | Frequency: {household.chore_frequency || 'N/A'}
                </p>
            )}
             {household?.next_chore_rotation_date && (
                <p className="text-xs text-gray-500">
                    Next rotation scheduled for: {new Date(household.next_chore_rotation_date + 'T00:00:00').toLocaleDateString()}
                </p>
            )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddChoreModal(true)}
            className="btn-secondary-sm flex items-center"
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add Chore
          </button>
          <button
            onClick={handleForceRotation}
            disabled={isRotating}
            className="btn-secondary-sm flex items-center"
            title="Manually trigger next chore rotation if due or re-initialize"
          >
            {isRotating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Rotate/Refresh
          </button>
        </div>
      </div>

      {activeMembersCount < targetMemberCount && targetMemberCount > 0 && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-md">
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className="text-sm">
                        Waiting for {targetMemberCount - activeMembersCount} more member(s) to join.
                        Chores assigned to placeholders will need to be manually reassigned or will rotate to actual members once they join and rotation occurs.
                    </p>
                </div>
            </div>
        </div>
      )}

      {assignments.length === 0 && !isLoading && (
        <div className="text-center py-10 bg-white p-6 rounded-lg shadow">
          <Circle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No chores assigned yet.</h3>
          <p className="mt-1 text-sm text-gray-500">
            Household admin might need to set up core chores, or it's time for a rotation.
          </p>
           <button onClick={handleForceRotation} className="mt-4 btn-primary">
            Initialize / Rotate Chores Now
          </button>
        </div>
      )}

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
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Recently Completed</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assignments.filter(a => a.status === 'completed').slice(0,4) // Show a few recent ones
                .map(assignment => (
                <ChoreCard 
                    key={assignment.id} 
                    assignment={assignment} 
                    currentUserId={user?.id}
                    onMarkComplete={handleMarkComplete} // Though it's already complete
                    isLoadingCompletion={false}
                />
                ))}
            </div>
        </div>
      )}

        {/* TODO: Rotation Schedule and Activity Feed based on user's design */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
            <div className="lg:col-span-1 bg-white p-4 rounded-2xl shadow-md">
                Rotation Schedule placeholder
            </div>
            <div className="lg:col-span-3 bg-white p-4 rounded-2xl shadow-md">
                Weekly Calendar placeholder
            </div>
            <div className="lg:col-span-1 bg-white p-4 rounded-2xl shadow-md">
                Activity Feed placeholder
            </div>
        </div> */}

        {showAddChoreModal && (
            <AddChoreModal
                householdId={householdId}
                onClose={() => setShowAddChoreModal(false)}
                onChoreAdded={() => {
                    fetchData(false); // Re-fetch without main loading spinner
                }}
            />
        )}
    </div>
  );
};