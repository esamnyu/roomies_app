// src/components/modals/ChoreActionsModal.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, UserPlus, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { 
  snoozeChore, 
  swapChores, 
  delegateChore, 
  getAvailableSwapOptions,
  getSuggestedSnoozeDates,
  formatDateForDB,
  type SwapOption
} from '@/lib/api/chores';
import { getHouseholdMembers } from '@/lib/api/households';
import type { ChoreAssignment, HouseholdMember } from '@/lib/types/types';
import toast from 'react-hot-toast';

interface ChoreActionsModalProps {
  assignment: ChoreAssignment;
  action: 'snooze' | 'swap' | 'delegate';
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onActionComplete: () => void;
}

export const ChoreActionsModal: React.FC<ChoreActionsModalProps> = ({
  assignment,
  action,
  currentUserId,
  isAdmin,
  onClose,
  onActionComplete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');
  
  // Snooze state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>('');
  const suggestedDates = getSuggestedSnoozeDates(assignment.due_date);
  
  // Swap state
  const [swapOptions, setSwapOptions] = useState<SwapOption[]>([]);
  const [selectedSwap, setSelectedSwap] = useState<string>('');
  
  // Delegate state
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');

  useEffect(() => {
    if (action === 'swap') {
      loadSwapOptions();
    } else if (action === 'delegate') {
      loadMembers();
    }
  }, [action]);

  const loadSwapOptions = async () => {
    try {
      const options = await getAvailableSwapOptions(assignment.id);
      setSwapOptions(options);
    } catch (error) {
      console.error('Error loading swap options:', error);
      toast.error('Failed to load swap options');
    }
  };

  const loadMembers = async () => {
    try {
      const allMembers = await getHouseholdMembers(assignment.household_id);
      // Filter out current assignee
      const availableMembers = allMembers.filter(
        m => m.user_id !== assignment.assigned_user_id && m.profiles
      );
      setMembers(availableMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load household members');
    }
  };

  const handleSnooze = async () => {
    const dateToUse = selectedDate === 'custom' ? customDate : selectedDate;
    if (!dateToUse) {
      toast.error('Please select a date');
      return;
    }

    setIsLoading(true);
    try {
      await snoozeChore(assignment.id, dateToUse, reason);
      toast.success('Chore rescheduled successfully');
      onActionComplete();
      onClose();
    } catch (error: any) {
      console.error('Error snoozing chore:', error);
      
      // Check for permission error
      if (error?.message?.includes('Only the assigned user or admin')) {
        toast.error("You can only reschedule chores assigned to you");
      } else if (error?.message?.includes('Assignment not found or no permission')) {
        toast.error("You don't have permission to reschedule this chore");
      } else {
        toast.error('Failed to reschedule chore');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!selectedSwap) {
      toast.error('Please select a chore to swap with');
      return;
    }

    setIsLoading(true);
    try {
      await swapChores(assignment.id, selectedSwap, reason);
      toast.success('Chores swapped successfully');
      onActionComplete();
      onClose();
    } catch (error: any) {
      console.error('Error swapping chores:', error);
      
      // Check for permission error
      if (error?.message?.includes('permission') || error?.message?.includes('not assigned to you')) {
        toast.error("You can only swap chores that are assigned to you");
      } else {
        toast.error('Failed to swap chores');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelegate = async () => {
    if (!selectedMember) {
      toast.error('Please select a member to delegate to');
      return;
    }

    setIsLoading(true);
    try {
      const result = await delegateChore(assignment.id, selectedMember, reason);
      toast.success(`Chore delegated to ${result.newAssigneeName}`);
      onActionComplete();
      onClose();
    } catch (error: any) {
      console.error('Error delegating chore:', error);
      
      // Check for permission error
      if (error?.message?.includes('permission') || error?.message?.includes('not assigned to you')) {
        toast.error("You can only delegate chores that are assigned to you");
      } else {
        toast.error('Failed to delegate chore');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    switch (action) {
      case 'snooze':
        handleSnooze();
        break;
      case 'swap':
        handleSwap();
        break;
      case 'delegate':
        handleDelegate();
        break;
    }
  };

  const getModalTitle = () => {
    switch (action) {
      case 'snooze':
        return 'Reschedule Chore';
      case 'swap':
        return 'Swap Chores';
      case 'delegate':
        return 'Delegate Chore';
    }
  };

  const getModalIcon = () => {
    switch (action) {
      case 'snooze':
        return <Calendar className="h-5 w-5" />;
      case 'swap':
        return <Users className="h-5 w-5" />;
      case 'delegate':
        return <UserPlus className="h-5 w-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              {getModalIcon()}
              <h2 className="text-xl font-semibold">{getModalTitle()}</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Current chore info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 mb-1">
              {assignment.chore_definition?.name}
            </h3>
            <p className="text-sm text-gray-600">
              Due: {new Date(assignment.due_date + 'T00:00:00').toLocaleDateString()}
            </p>
            {assignment.assigned_profile && (
              <p className="text-sm text-gray-600">
                Assigned to: {assignment.assigned_profile.name}
              </p>
            )}
          </div>

          {/* Action-specific content */}
          {action === 'snooze' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select new date
                </label>
                <div className="space-y-2">
                  {suggestedDates.map((date, index) => (
                    <label key={index} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="snoozeDate"
                        value={formatDateForDB(date)}
                        checked={selectedDate === formatDateForDB(date)}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-primary"
                      />
                      <span className="text-sm">
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="snoozeDate"
                      value="custom"
                      checked={selectedDate === 'custom'}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-primary"
                    />
                    <span className="text-sm">Custom date</span>
                  </label>
                </div>
                {selectedDate === 'custom' && (
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          )}

          {action === 'swap' && (
            <div className="space-y-4">
              {swapOptions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p>No available chores to swap with</p>
                  <p className="text-sm mt-1">Swaps are only available with chores due within 7 days</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select chore to swap with
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {swapOptions.map((option) => (
                      <label 
                        key={option.assignment_id} 
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="swapOption"
                          value={option.assignment_id}
                          checked={selectedSwap === option.assignment_id}
                          onChange={(e) => setSelectedSwap(e.target.value)}
                          className="mt-1 text-primary"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{option.chore_name}</p>
                          <p className="text-sm text-gray-600">
                            Assigned to: {option.assigned_user_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Due: {new Date(option.due_date + 'T00:00:00').toLocaleDateString()}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {action === 'delegate' && (
            <div className="space-y-4">
              {members.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p>No other members available</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select member to delegate to
                  </label>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <label 
                        key={member.user_id} 
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="delegateMember"
                          value={member.user_id}
                          checked={selectedMember === member.user_id}
                          onChange={(e) => setSelectedMember(e.target.value)}
                          className="text-primary"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{member.profiles?.name || 'Unknown'}</p>
                          {member.role === 'admin' && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason field */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a note about this change..."
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || 
                (action === 'snooze' && !selectedDate) ||
                (action === 'swap' && !selectedSwap) ||
                (action === 'delegate' && !selectedMember)
              }
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};