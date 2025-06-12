// src/lib/api/chores.ts
import { supabase } from '../supabase';
import type { Household, HouseholdChore, ChoreAssignment, HouseholdMember } from '../types/types';
import { getHouseholdDetails, getHouseholdMembers } from './households';


export const getHouseholdChores = async (householdId: string): Promise<HouseholdChore[]> => {
    const { data, error } = await supabase
        .from('household_chores')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching household chores definitions:", error);
        throw error;
    }
    return data || [];
};

export const updateHouseholdChore = async (choreId: string, updates: Partial<Pick<HouseholdChore, 'name' | 'description'>>) => {
    const { data, error } = await supabase
        .from('household_chores')
        .update(updates)
        .eq('id', choreId)
        .select()
        .single();
    if (error) {
        console.error("Error updating chore:", error);
        throw error;
    }
    return data;
};

export const toggleChoreActive = async (choreId: string, isActive: boolean) => {
    const { data, error } = await supabase
        .from('household_chores')
        .update({ is_active: isActive })
        .eq('id', choreId)
        .select()
        .single();
    if (error) {
        console.error("Error toggling chore status:", error);
        throw error;
    }
    return data;
};

export const addCustomChoreToHousehold = async (householdId: string, name: string, description?: string): Promise<HouseholdChore | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: newChore, error } = await supabase
        .from('household_chores')
        .insert({
            household_id: householdId,
            name,
            description,
            is_core_chore: false,
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding custom chore:", error);
        throw error;
    }
    return newChore;
};

export const initializeChoresForHousehold = async (householdId: string, householdData?: Household): Promise<void> => {
  const household = householdData || await getHouseholdDetails(householdId);
  if (!household || !household.core_chores || household.core_chores.length === 0) {
    console.log(`No core chores defined for household ${householdId}, skipping initialization.`);
    return;
  }

  const { data: existingChores, error: fetchError } = await supabase
    .from('household_chores')
    .select('name')
    .eq('household_id', householdId)
    .in('name', household.core_chores);

  if (fetchError) {
    console.error('Error fetching existing household chores:', fetchError);
    return;
  }

  const existingChoreNames = existingChores?.map(c => c.name) || [];
  const choresToCreate = household.core_chores
    .filter(coreChoreName => !existingChoreNames.includes(coreChoreName))
    .map((name, index) => ({
      household_id: householdId,
      name,
      is_core_chore: true,
      is_active: true,
      default_order: index,
    }));

  if (choresToCreate.length > 0) {
    console.log(`Initializing ${choresToCreate.length} new core chores for household ${householdId}.`);
    const { error: insertError } = await supabase.from('household_chores').insert(choresToCreate);
    if (insertError) {
      console.error('Error inserting new core chores:', insertError);
    }
  }
  
  await assignChoresForCurrentCycle(householdId, household);
};

export const assignChoresForCurrentCycle = async (householdId: string, householdOverride?: Household): Promise<ChoreAssignment[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const household = householdOverride || await getHouseholdDetails(householdId);
  if (!household) throw new Error('Household not found');

  const members = await getHouseholdMembers(householdId);
  if (members.length === 0) {
      if(household.member_count && household.member_count > 0) {
          console.log("No members yet, chore assignment skipped or will use placeholders.");
          return [];
      } else {
          throw new Error('No members in household to assign chores to.');
      }
  }

  const { data: choresDefinitions, error: choresError } = await supabase
    .from('household_chores')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('default_order', { ascending: true });

  if (choresError) {
    console.error('Error fetching active chores for assignment:', choresError);
    return [];
  }

  if (!choresDefinitions || choresDefinitions.length === 0) {
    console.log(`No active chores found to assign for household ${householdId}.`);
    return [];
  }

  const frequency = household.chore_frequency || 'Weekly';
  const framework = household.chore_framework || 'Split';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cycleStartDate: Date;
  if (household.next_chore_rotation_date && new Date(household.next_chore_rotation_date) > today) {
      cycleStartDate = household.last_chore_rotation_date ? new Date(household.last_chore_rotation_date) : today;
  } else {
      cycleStartDate = today;
  }


  const dueDate = new Date(cycleStartDate);
  switch (frequency) {
    case 'Daily': dueDate.setDate(cycleStartDate.getDate() + 1); break;
    case 'Weekly': dueDate.setDate(cycleStartDate.getDate() + 7); break;
    case 'Bi-weekly': dueDate.setDate(cycleStartDate.getDate() + 14); break;
    case 'Monthly': dueDate.setMonth(cycleStartDate.getMonth() + 1); break;
    default: dueDate.setDate(cycleStartDate.getDate() + 7);
  }
  dueDate.setHours(23, 59, 59, 999);

  const newAssignments: Omit<ChoreAssignment, 'id' | 'created_at' | 'updated_at'>[] = [];

  const targetMemberCount = household.member_count || members.length;
  const memberIdsForAssignment: string[] = members.map(m => m.user_id);
  for (let i = members.length; i < targetMemberCount; i++) {
      memberIdsForAssignment.push(`placeholder_${i + 1}`);
  }

  let currentAssigneeIndex = household.chore_current_assignee_index ?? 0;
  if(currentAssigneeIndex >= memberIdsForAssignment.length) currentAssigneeIndex = 0;


  if (framework === 'One person army') {
    const assigneeUserId = memberIdsForAssignment[currentAssigneeIndex];
    choresDefinitions.forEach(choreDef => {
      newAssignments.push({
        household_chore_id: choreDef.id,
        household_id: householdId,
        assigned_user_id: assigneeUserId,
        cycle_start_date: cycleStartDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      });
    });
    currentAssigneeIndex = (currentAssigneeIndex + 1) % memberIdsForAssignment.length;
  } else {
    choresDefinitions.forEach((choreDef, index) => {
      const assigneeUserId = memberIdsForAssignment[(currentAssigneeIndex + index) % memberIdsForAssignment.length];
      newAssignments.push({
        household_chore_id: choreDef.id,
        household_id: householdId,
        assigned_user_id: assigneeUserId,
        cycle_start_date: cycleStartDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      });
    });
     currentAssigneeIndex = (currentAssigneeIndex + 1) % memberIdsForAssignment.length;
  }

  const { error: deleteError } = await supabase
    .from('chore_assignments')
    .delete()
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .gte('cycle_start_date', cycleStartDate.toISOString().split('T')[0]);

  if (deleteError) {
      console.warn("Could not clear old pending assignments:", deleteError);
  }

  const { data: insertedAssignments, error: insertAssignmentsError } = await supabase
    .from('chore_assignments')
    .insert(newAssignments)
    .select();

  if (insertAssignmentsError) {
    console.error('Error inserting new chore assignments:', insertAssignmentsError);
    throw insertAssignmentsError;
  }

  const { error: updateHouseholdError } = await supabase
    .from('households')
    .update({
        last_chore_rotation_date: cycleStartDate.toISOString().split('T')[0],
        next_chore_rotation_date: dueDate.toISOString().split('T')[0],
        chore_current_assignee_index: currentAssigneeIndex
    })
    .eq('id', householdId);

  if (updateHouseholdError) {
    console.error('Error updating household rotation dates:', updateHouseholdError);
  }

  return insertedAssignments || [];
};

export const getHouseholdChoreAssignmentsWithDetails = async (householdId: string): Promise<ChoreAssignment[]> => {
  const { data, error } = await supabase
    .from('chore_assignments')
    .select(`
      *,
      chore_definition:household_chore_id (*),
      assigned_profile:profiles (id, name, avatar_url)
    `)
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching chore assignments with details:', error);
    throw error;
  }
  return data || [];
};

export const markChoreAssignmentComplete = async (assignmentId: string, userId: string): Promise<ChoreAssignment | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('chore_assignments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by_user_id: userId
    })
    .eq('id', assignmentId)
    .select(`
      *,
      chore_definition:household_chore_id (*),
      assigned_profile:profiles (id, name, avatar_url)
    `)
    .single();

  if (error) {
    console.error("Error marking chore complete:", error);
    throw error;
  }
  return data;
};

export const getChoreRotationUIData = async (
  householdId: string
): Promise<{
  currentAssignments: ChoreAssignment[],
  householdInfo: Household | null,
  members: HouseholdMember[]
}> => {
  const householdInfo = await getHouseholdDetails(householdId);
  const members = await getHouseholdMembers(householdId);

  const cycleStartDateToQuery = householdInfo?.last_chore_rotation_date || new Date().toISOString().split('T')[0];

  const { data: currentAssignments, error } = await supabase
    .from('chore_assignments')
    .select(`
      *,
      chore_definition:household_chore_id (*),
      assigned_profile:profiles (id, name, avatar_url)
    `)
    .eq('household_id', householdId)
    .eq('cycle_start_date', cycleStartDateToQuery)
    .order('due_date', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error("Error fetching current chore assignments for UI data:", error);
    throw error;
  }

  return {
    currentAssignments: currentAssignments || [],
    householdInfo,
    members,
  };
};

export const checkAndTriggerChoreRotation = async (householdId: string): Promise<boolean> => {
  const household = await getHouseholdDetails(householdId);
  if (!household) {
      console.warn(`Could not find household ${householdId} to check for chore rotation.`);
      return false;
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  if (household.next_chore_rotation_date) {
    const nextRotationDate = new Date(household.next_chore_rotation_date);
    nextRotationDate.setHours(0,0,0,0);

    if (today >= nextRotationDate) {
      console.log(`Chore rotation due for household ${householdId}. Triggering...`);
      await assignChoresForCurrentCycle(householdId, household);
      return true;
    }
  } else {
    console.log(`Initial chore assignment or re-initialization for household ${householdId}.`);
    await initializeChoresForHousehold(householdId, household);
    return true;
  }
  
  console.log(`Chore rotation not yet due for household ${householdId}.`);
  return false;
};