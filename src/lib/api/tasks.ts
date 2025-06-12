// src/lib/api/tasks.ts
import { supabase } from '../supabase';
import type { Task } from '../types/types';

/**
 * A helper function to verify if the current user is a member of the household.
 * Throws an error if the user is not authenticated or not a member.
 */
const ensureUserIsMember = async (householdId: string): Promise<string> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated. Please log in.');
  }

  const { data: membership, error: memberError } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    throw new Error('You are not authorized to perform actions in this household.');
  }

  return user.id;
};

/**
 * Creates a new task in a household.
 * @param householdId - The ID of the household.
 * @param title - The title of the task.
 * @param assignedTo - (Optional) The user ID of the person the task is assigned to.
 * @returns The newly created task, with the assignee's profile if applicable.
 */
export const createTask = async (householdId: string, title: string, assignedTo?: string): Promise<Task> => {
  // First, ensure the user is authenticated and a member of the household.
  await ensureUserIsMember(householdId);

  // If a user is assigned, verify they are also a member of the household.
  if (assignedTo) {
    const { error: assigneeError } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', assignedTo)
      .single();

    if (assigneeError) {
      throw new Error('Assigned user is not a member of this household.');
    }
  }

  const taskData: Partial<Task> = {
    household_id: householdId,
    title,
    completed: false,
    assigned_to: assignedTo || undefined,
  };
  
  // Insert the new task and immediately select it with the profile information.
  // This avoids a second database call.
  const { data: insertedTask, error: insertError } = await supabase
    .from('tasks')
    .insert(taskData)
    .select('*, profiles:assigned_to (id, name, avatar_url)')
    .single();

  if (insertError) {
    console.error('Supabase error creating task:', insertError);
    throw insertError;
  }

  return insertedTask;
};

/**
 * Fetches all tasks for a given household, ordered by completion status and creation date.
 * @param householdId - The ID of the household.
 * @returns An array of tasks with associated profiles.
 */
export const getHouseholdTasks = async (householdId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, profiles:assigned_to (id, name, avatar_url)')
    .eq('household_id', householdId)
    .order('completed', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  
  return data || [];
};

/**
 * Updates an existing task with new data.
 * @param taskId - The ID of the task to update.
 * @param updates - An object containing the fields to update.
 * @returns The updated task object with profile information.
 */
export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  // Combine the update and select into a single query for efficiency.
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select('*, profiles:assigned_to (id, name, avatar_url)')
    .single();

  if (updateError) {
    console.error('Error updating task:', updateError);
    throw updateError;
  }

  return updatedTask;
};

/**
 * Marks a specific task as complete.
 * @param taskId - The ID of the task to complete.
 * @returns The completed task object.
 */
export const completeTask = async (taskId: string): Promise<Task> => {
  return updateTask(taskId, { completed: true, completed_at: new Date().toISOString() });
};