// src/lib/api/tasks.ts
import { supabase } from '../supabase';
import { withErrorHandling, handleSupabaseError, ValidationError, NotFoundError } from '@/lib/errors';
import { requireHouseholdMember } from '@/lib/api/auth/middleware';
import { 
  createTaskSchema, 
  validateInput, 
  uuidSchema
} from '@/lib/api/validation/schemas';
import type { Task } from '../types/types';

/**
 * Creates a new task in a household.
 * @param householdId - The ID of the household.
 * @param title - The title of the task.
 * @param assignedTo - (Optional) The user ID of the person the task is assigned to.
 * @returns The newly created task, with the assignee's profile if applicable.
 */
export const createTask = withErrorHandling(async (
  householdId: string, 
  title: string, 
  assignedTo?: string
) => {
  // Validate input
  const validatedData = validateInput(createTaskSchema, {
    householdId,
    title,
    assignedTo
  });

  // Ensure the user is authenticated and a member of the household
  await requireHouseholdMember(validatedData.householdId);

  // If a user is assigned, verify they are also a member of the household
  if (validatedData.assignedTo) {
    await requireHouseholdMember(validatedData.householdId, validatedData.assignedTo);
  }

  const taskData: Partial<Task> = {
    household_id: validatedData.householdId,
    title: validatedData.title,
    completed: false,
    assigned_to: validatedData.assignedTo || undefined,
  };
  
  // Insert the new task and immediately select it with the profile information
  const { data: insertedTask, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select('*, profiles:assigned_to (id, name, avatar_url)')
    .single();

  if (error) {
    handleSupabaseError(error);
  }

  if (!insertedTask) {
    throw new Error('Failed to create task');
  }

  return insertedTask;
}, 'createTask');

/**
 * Fetches all tasks for a given household, ordered by completion status and creation date.
 * @param householdId - The ID of the household.
 * @returns An array of tasks with associated profiles.
 */
export const getHouseholdTasks = withErrorHandling(async (householdId: string) => {
  // Validate household ID
  const validatedId = validateInput(uuidSchema, householdId);

  // Ensure the user is a member of the household
  await requireHouseholdMember(validatedId);

  const { data, error } = await supabase
    .from('tasks')
    .select('*, profiles:assigned_to (id, name, avatar_url)')
    .eq('household_id', validatedId)
    .order('completed', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    handleSupabaseError(error);
  }
  
  return data || [];
}, 'getHouseholdTasks');

/**
 * Updates an existing task with new data.
 * @param taskId - The ID of the task to update.
 * @param updates - An object containing the fields to update.
 * @returns The updated task object with profile information.
 */
export const updateTask = withErrorHandling(async (
  taskId: string, 
  updates: Partial<Task>
) => {
    // Validate task ID
    const validatedTaskId = validateInput(uuidSchema, taskId);

    // Validate updates - ensure no invalid fields are being updated
    const allowedUpdates: Partial<Task> = {};
    
    // Handle each field explicitly to maintain type safety
    if ('title' in updates && updates.title !== undefined) {
      allowedUpdates.title = updates.title;
    }
    if ('assigned_to' in updates && updates.assigned_to !== undefined) {
      validateInput(uuidSchema, updates.assigned_to);
      allowedUpdates.assigned_to = updates.assigned_to;
    }
    if ('completed' in updates && updates.completed !== undefined) {
      allowedUpdates.completed = updates.completed;
    }
    if ('completed_at' in updates && updates.completed_at !== undefined) {
      allowedUpdates.completed_at = updates.completed_at;
    }

    // First, get the task to check household membership
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('household_id')
      .eq('id', validatedTaskId)
      .single();

    if (fetchError || !existingTask) {
      throw new NotFoundError('Task');
    }

    // Ensure the user is a member of the household
    await requireHouseholdMember(existingTask.household_id);

    // If assigning to someone new, verify they are a member of the household
    if (allowedUpdates.assigned_to) {
      await requireHouseholdMember(existingTask.household_id, allowedUpdates.assigned_to);
    }

    // Perform the update
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(allowedUpdates)
      .eq('id', validatedTaskId)
      .select('*, profiles:assigned_to (id, name, avatar_url)')
      .single();

    if (updateError) {
      handleSupabaseError(updateError);
    }

    if (!updatedTask) {
      throw new Error('Failed to update task');
    }

    return updatedTask;
}, 'updateTask');

/**
 * Marks a specific task as complete.
 * @param taskId - The ID of the task to complete.
 * @returns The completed task object.
 */
export const completeTask = withErrorHandling(async (taskId: string) => {
  return updateTask(taskId, { 
    completed: true, 
    completed_at: new Date().toISOString() 
  });
}, 'completeTask');

/**
 * Deletes a task from the household.
 * @param taskId - The ID of the task to delete.
 * @returns void
 */
export const deleteTask = withErrorHandling(async (taskId: string) => {
    // Validate task ID
    const validatedTaskId = validateInput(uuidSchema, taskId);

    // First, get the task to check household membership
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('household_id')
      .eq('id', validatedTaskId)
      .single();

    if (fetchError || !existingTask) {
      throw new NotFoundError('Task');
    }

    // Ensure the user is a member of the household (could be admin-only if you want)
    await requireHouseholdMember(existingTask.household_id);
    
    // Optional: Only allow admins to delete tasks
    // if (memberRole !== 'admin') {
    //   throw new AuthorizationError('Only admins can delete tasks');
    // }

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', validatedTaskId);

    if (deleteError) {
      handleSupabaseError(deleteError);
    }
}, 'deleteTask');

/**
 * Bulk update multiple tasks at once (e.g., mark all as complete).
 * @param taskIds - Array of task IDs to update.
 * @param updates - The updates to apply to all tasks.
 * @returns Array of updated tasks.
 */
export const bulkUpdateTasks = withErrorHandling(async (
  taskIds: string[], 
  updates: Partial<Task>
) => {
    // Validate all task IDs
    const validatedTaskIds = taskIds.map(id => validateInput(uuidSchema, id));

    if (validatedTaskIds.length === 0) {
      throw new ValidationError('No task IDs provided');
    }

    // Get all tasks to verify household membership
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, household_id')
      .in('id', validatedTaskIds);

    if (fetchError || !tasks || tasks.length === 0) {
      throw new NotFoundError('Tasks');
    }

    // Verify all tasks are from the same household
    const householdIds = [...new Set(tasks.map(t => t.household_id))];
    if (householdIds.length > 1) {
      throw new ValidationError('Tasks must all be from the same household');
    }

    // Check user is a member of the household
    await requireHouseholdMember(householdIds[0]);

    // Perform bulk update
    const { data: updatedTasks, error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', validatedTaskIds)
      .select('*, profiles:assigned_to (id, name, avatar_url)');

    if (updateError) {
      handleSupabaseError(updateError);
    }

    return updatedTasks || [];
}, 'bulkUpdateTasks');