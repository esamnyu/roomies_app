// src/lib/api/tasks.ts
import { supabase } from '../supabase';
import type { Task } from '../types/types';

export const createTask = async (householdId: string, title: string, assignedTo?: string): Promise<Task> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser(); if (authError || !user) { throw new Error('Not authenticated'); }
  const { data: membership, error: memberError } = await supabase.from('household_members').select('id').eq('household_id', householdId).eq('user_id', user.id).single(); if (memberError || !membership) { throw new Error('You are not a member of this household');}
  if (assignedTo) { const { data: assigneeMember, error: assigneeError } = await supabase.from('household_members').select('id').eq('household_id', householdId).eq('user_id', assignedTo).single(); if (assigneeError || !assigneeMember) { throw new Error('Assigned user is not a member of this household'); } }
  const taskData: Partial<Task> = { household_id: householdId, title, completed: false }; if (assignedTo) { taskData.assigned_to = assignedTo; }
  const { data: insertedTask, error: insertError } = await supabase.from('tasks').insert(taskData).select('*').single(); if (insertError) { console.error('Supabase error creating task:', insertError); throw insertError; }
  if (insertedTask.assigned_to) { const { data: taskWithProfile, error: fetchError } = await supabase.from('tasks').select(`*, profiles:assigned_to (id, name, avatar_url)`).eq('id', insertedTask.id).single(); if (fetchError) { console.error('Error fetching task with profile:', fetchError); return insertedTask; } return taskWithProfile; }
  return insertedTask;
};

export const getHouseholdTasks = async (householdId: string): Promise<Task[]> => {
  const { data, error } = await supabase.from('tasks').select(`*, profiles:assigned_to (id, name, avatar_url)`).eq('household_id', householdId).order('completed', { ascending: true }).order('created_at', { ascending: false });
  if (error) throw error; return data || [];
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  const { data: updatedTask, error: updateError } = await supabase.from('tasks').update(updates).eq('id', taskId).select('*').single(); if (updateError) { console.error('Error updating task:', updateError); throw updateError; }
  if (updatedTask.assigned_to) { const { data: taskWithProfile, error: fetchError } = await supabase.from('tasks').select(`*, profiles:assigned_to (id, name, avatar_url)`).eq('id', taskId).single(); if (fetchError) { console.error('Error fetching task with profile:', fetchError); return updatedTask; } return taskWithProfile; }
  return updatedTask;
};

export const completeTask = async (taskId: string): Promise<Task> => {
  return updateTask(taskId, { completed: true, completed_at: new Date().toISOString() });
};