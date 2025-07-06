// src/lib/api/choreManagement.ts
import { supabase } from '@/lib/supabase';
import type { ChoreAssignment, HouseholdMember } from '@/lib/types/types';

// Snooze a chore to a later date
export const snoozeChore = async (
  assignmentId: string, 
  newDueDate: string, 
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.rpc('snooze_chore_assignment', {
      p_assignment_id: assignmentId,
      p_new_due_date: newDueDate,
      p_reason: reason || null
    });

    if (error) throw error;
    
    return {
      success: data.success,
      message: data.message
    };
  } catch (error: any) {
    console.error('Error snoozing chore:', error);
    
    // If it's a notification constraint error, we can still update the chore directly
    if (error?.code === '23514' && error?.message?.includes('notifications')) {
      // Fallback: Update the chore assignment directly without notification
      try {
        const { error: updateError } = await supabase
          .from('chore_assignments')
          .update({ 
            due_date: newDueDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentId);
          
        if (updateError) throw updateError;
        
        return {
          success: true,
          message: 'Chore rescheduled successfully'
        };
      } catch (fallbackError) {
        console.error('Fallback update failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
};

// Swap two chore assignments between users
export const swapChores = async (
  assignment1Id: string,
  assignment2Id: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.rpc('swap_chore_assignments', {
      p_assignment1_id: assignment1Id,
      p_assignment2_id: assignment2Id,
      p_reason: reason || null
    });

    if (error) throw error;
    
    return {
      success: data.success,
      message: data.message
    };
  } catch (error) {
    console.error('Error swapping chores:', error);
    throw error;
  }
};

// Delegate a chore to another household member
export const delegateChore = async (
  assignmentId: string,
  newAssigneeId: string,
  reason?: string
): Promise<{ 
  success: boolean; 
  message: string;
  newAssigneeName?: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('delegate_chore_assignment', {
      p_assignment_id: assignmentId,
      p_new_assignee_id: newAssigneeId,
      p_reason: reason || null
    });

    if (error) throw error;
    
    return {
      success: data.success,
      message: data.message,
      newAssigneeName: data.new_assignee_name
    };
  } catch (error) {
    console.error('Error delegating chore:', error);
    throw error;
  }
};

// Get available swap options for a chore
export interface SwapOption {
  assignment_id: string;
  chore_name: string;
  assigned_user_id: string;
  assigned_user_name: string;
  due_date: string;
}

export const getAvailableSwapOptions = async (
  assignmentId: string
): Promise<SwapOption[]> => {
  try {
    const { data, error } = await supabase.rpc('get_available_swap_options', {
      p_assignment_id: assignmentId
    });

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting swap options:', error);
    throw error;
  }
};

// Assign placeholder chores to a new member
export const assignPlaceholderChoresToMember = async (
  householdId: string,
  userId: string
): Promise<{ 
  success: boolean; 
  assignmentsUpdated: number;
  message: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('assign_placeholder_chores_to_member', {
      p_household_id: householdId,
      p_user_id: userId
    });

    if (error) throw error;
    
    return {
      success: data.success,
      assignmentsUpdated: data.assignments_updated,
      message: data.message
    };
  } catch (error) {
    console.error('Error assigning placeholder chores:', error);
    throw error;
  }
};

// Helper function to check if a date is valid for snoozing
export const isValidSnoozeDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
};

// Helper function to format date for the database
export const formatDateForDB = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to calculate suggested snooze dates
export const getSuggestedSnoozeDates = (currentDueDate: string): Date[] => {
  const due = new Date(currentDueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const suggestions: Date[] = [];
  
  // Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow > due) suggestions.push(tomorrow);
  
  // 3 days from now
  const threeDays = new Date(today);
  threeDays.setDate(threeDays.getDate() + 3);
  if (threeDays > due) suggestions.push(threeDays);
  
  // 1 week from now
  const oneWeek = new Date(today);
  oneWeek.setDate(oneWeek.getDate() + 7);
  if (oneWeek > due) suggestions.push(oneWeek);
  
  // Next occurrence of the same day of week
  const nextSameDay = new Date(due);
  nextSameDay.setDate(nextSameDay.getDate() + 7);
  if (nextSameDay > today) suggestions.push(nextSameDay);
  
  return suggestions;
};