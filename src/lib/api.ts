// esamnyu/roomies_app/roomies_app-feat-landing-and-onboarding/src/lib/api.ts
import { ReactNode } from 'react';
import { supabase } from './supabase';

// --- bestehende Typen (gekürzt zur Übersichtlichkeit) ---
export interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  email?: string;
}

export interface Household {
  memberCount: ReactNode; // Consider if this is still needed or use member_count
  id: string;
  name:string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number; // Target member count from setup
  core_chores?: string[];
  chore_frequency?: 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly'; // Made more specific
  chore_framework?: 'Split' | 'One person army'; // Made more specific
  join_code?: string | null;

  // Chore specific fields for household settings
  last_chore_rotation_date?: string | null; // ISO date string
  next_chore_rotation_date?: string | null; // ISO date string
  chore_current_assignee_index?: number; // For 'One person army' rotation tracking
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: Profile;
  households?: Household;
  // For chore assignment ordering if needed, can be based on join_date or a specific order
  chore_rotation_order?: number; 
}

export interface Expense {
  id: string
  household_id: string
  description: string
  amount: number
  paid_by: string
  date: string
  created_at: string
  updated_at: string
  profiles?: Profile
  expense_splits?: ExpenseSplit[]
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  user_id: string
  amount: number
  settled: boolean
  settled_at?: string
  profiles?: Profile
}

// This is the existing Task type, which we'll differentiate from Chores
export interface Task {
  id: string
  household_id: string
  title: string
  assigned_to?: string
  completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
  profiles?: Profile // Profile of assigned_to user
}

export interface Settlement {
  id: string
  household_id: string
  payer_id: string
  payee_id: string
  amount: number
  description?: string
  created_at: string
  payer_profile?: Profile
  payee_profile?: Profile
}

export interface RecurringExpense {
  id: string
  household_id: string
  description: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  day_of_month?: number
  day_of_week?: number
  next_due_date: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string;
  user_id: string;
  household_id: string | null;
  type: 'expense_added' | 'payment_reminder' | 'task_assigned' | 'task_completed' | 'settlement_recorded' | 'recurring_expense_added' | 'member_joined' | 'member_left' | 'household_invitation' | 'message_sent' | 'chore_assigned' | 'chore_reminder' | 'chore_completed' | 'chore_missed';
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string
  household_id: string
  user_id: string
  content: string
  edited: boolean
  deleted: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
}

interface MessageWithProfileRPC {
  id: string
  household_id: string
  user_id: string
  content: string
  edited: boolean
  deleted: boolean
  created_at: string
  updated_at: string
  profile: any 
}


// --- NEW CHORE MANAGEMENT TYPES ---
export interface HouseholdChore { // Defines a chore for a household
  id: string; // pk
  household_id: string; // fk
  name: string;
  description?: string | null;
  is_core_chore: boolean; // Was it from the initial household.core_chores?
  default_order?: number | null; // For 'Split' framework, to maintain a consistent rotation order if desired
  created_at: string;
  updated_at: string;
  is_active: boolean; // To allow disabling a chore without deleting history
}

export interface ChoreAssignment { // Represents a specific assignment of a HouseholdChore
  id: string; // pk
  household_chore_id: string; // fk to household_chores
  household_id: string; // fk (denormalized for easier querying by household)
  assigned_user_id: string; // fk to profiles (who is it assigned to)
  // 'placeholder_N' if member_count > actual members who joined
  
  cycle_start_date: string; // ISO date (e.g., start of the week/period for this assignment batch)
  due_date: string; // ISO date
  
  status: 'pending' | 'completed' | 'missed' | 'skipped';
  completed_at?: string | null; // ISO timestamp
  completed_by_user_id?: string | null; // fk to profiles (in case someone else marks it)
  
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Joined data for display
  chore_definition?: HouseholdChore; // The actual chore details (name, desc)
  assigned_profile?: Profile | null; // Profile of the assigned user
}

// For displaying rotation schedule easily
export interface ChoreRotationPeriod {
  period_label: string; // e.g., "Week of June 10", "June 15 - June 21"
  assignments: Array<{
    chore_name: string;
    assigned_member_name: string | 'Placeholder';
    chore_id: string;
    assigned_user_id: string | null; // null if placeholder
  }>;
}
// --- END NEW CHORE MANAGEMENT TYPES ---


export interface CreateHouseholdParams {
  name: string;
  member_count: number;
  core_chores?: string[];
  chore_frequency?: string; // Will be 'Daily', 'Weekly', 'Bi-weekly', 'Monthly'
  chore_framework?: string; // Will be 'Split', 'One person army'
}

// --- AUTH FUNCTIONS (unverändert) ---
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  return { data, error };
};
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// --- PROFILE FUNCTIONS (unverändert) ---
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return { data, error };
};
export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  return { data, error };
};
export const getProfileWithEmail = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('*, email').eq('id', userId).single();
  return { data, error };
};

// --- HOUSEHOLD FUNCTIONS ---
export const createHousehold = async (params: CreateHouseholdParams) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const householdInsertData: Partial<Household> = {
    name: params.name,
    created_by: user.id,
    member_count: params.member_count,
    core_chores: params.core_chores,
    chore_frequency: params.chore_frequency as Household['chore_frequency'],
    chore_framework: params.chore_framework as Household['chore_framework'],
    last_chore_rotation_date: null, // Initialize chore fields
    next_chore_rotation_date: null,
  };

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert(householdInsertData)
    .select()
    .single();

  if (householdError) throw householdError;

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, user_id: user.id, role: 'admin' });

  if (memberError) {
    await supabase.from('households').delete().eq('id', household.id);
    throw memberError;
  }
  
  // After creating household, initialize its chores
  if (household.core_chores && household.core_chores.length > 0) {
    await initializeChoresForHousehold(household.id, household as Household); // Pass full household
  }

  return household;
};

// src/lib/api.ts
export const getUserHouseholds = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .rpc('get_user_households_with_counts', { p_user_id: user.id })

  if (error) {
    console.error('Error in getUserHouseholds RPC:', error); // More specific logging
    throw error
  }
  return data || []
}

export const getHouseholdData = async (householdId: string) => {
  const { data, error } = await supabase
    .rpc('get_household_data', { p_household_id: householdId })
  if (error) throw error
  return data
}

export const getHouseholdDetails = async (householdId: string): Promise<Household | null> => {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single();
  // If no household found, return null instead of throwing an error
  if (error) {
    console.error('Error fetching household details:', error);
    throw error; // Throw the error to be caught by the calling function's try/catch block
  }
  return data;
};

export const getHouseholdMembers = async (householdId: string): Promise<HouseholdMember[]> => {
  const { data, error } = await supabase
    .from('household_members')
    .select(`
      *,
      profiles (*), 
      households (*)
    `)
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true }); // CORRECTED: Was 'created_at'

  if (error) {
    console.error('Error fetching household members:', error); // It's good to log the specific error
    throw error;
  }
  return data || [];
};


// --- JOIN CODE FUNCTIONS (unverändert) ---
const generateRandomCode = (length = 4): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
export const generateAndGetHouseholdJoinCode = async (householdId: string): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: memberData, error: memberCheckError } = await supabase
    .from('household_members').select('role').eq('household_id', householdId).eq('user_id', user.id).single();
  if (memberCheckError || !memberData) { throw new Error('You are not authorized to manage this household.'); }
  const newCode = generateRandomCode(4);
  const { data: updatedHousehold, error: updateError } = await supabase
    .from('households').update({ join_code: newCode }).eq('id', householdId).select('join_code').single();
  if (updateError || !updatedHousehold?.join_code) { console.error('Error generating or updating join code:', updateError); throw new Error('Could not generate or update join code.'); }
  return updatedHousehold.join_code;
};
export const getActiveHouseholdJoinCode = async (householdId: string): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { count, error: memberCheckError } = await supabase
    .from('household_members').select('*', { count: 'exact', head: true }).eq('household_id', householdId).eq('user_id', user.id);
  if (memberCheckError || count === 0) { throw new Error('You are not authorized to view this household\'s join code.');}
  const { data: household, error } = await supabase.from('households').select('join_code').eq('id', householdId).single();
  if (error) { console.error('Error fetching join code:', error); return null; }
  return household?.join_code || null;
};
export const joinHouseholdWithCode = async (joinCode: string): Promise<Household> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated. Please log in to join a household.');
  const normalizedCode = joinCode.toUpperCase().trim();
  if (normalizedCode.length !== 4) { throw new Error('Invalid join code format. Code must be 4 characters.'); }
  const { data: household, error: householdError } = await supabase
    .from('households').select('id, name, member_count, join_code').eq('join_code', normalizedCode).single();
  if (householdError || !household) { console.error('Error finding household by code:', householdError); throw new Error('Invalid or expired join code.');}
  const { data: existingMember, error: existingMemberError } = await supabase
    .from('household_members').select('id').eq('household_id', household.id).eq('user_id', user.id).single();
  if (existingMember) { throw new Error('You are already a member of this household.'); }
  if (existingMemberError && existingMemberError.code !== 'PGRST116') { throw existingMemberError; }
  const { data: members, error: membersError } = await supabase
    .from('household_members').select('user_id').eq('household_id', household.id);
  if (membersError) { console.error('Error fetching current members:', membersError); throw new Error('Could not verify household capacity.'); }
  const currentMemberCount = members?.length || 0;
  if (household.member_count && currentMemberCount >= household.member_count) { throw new Error('This household is currently full.');}
  const { error: addMemberError } = await supabase
    .from('household_members').insert({ household_id: household.id, user_id: user.id, role: 'member' });
  if (addMemberError) { console.error('Error adding member to household:', addMemberError); throw new Error('Failed to join household. Please try again.'); }
  return household as Household;
};

// --- EXPENSE FUNCTIONS  ---

export const getHouseholdExpenses = async (householdId: string) => {
  const { data, error } = await supabase.from('expenses').select(`*, profiles:paid_by (id, name, avatar_url), expense_splits (*, profiles:user_id (id, name, avatar_url))`).eq('household_id', householdId).order('date', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error; return data || [];
};
export const markExpenseSettled = async (expenseId: string, userId: string) => {
  const { data, error } = await supabase.from('expense_splits').update({ settled: true, settled_at: new Date().toISOString() }).eq('expense_id', expenseId).eq('user_id', userId);
  if (error) throw error; return data;
};
export const createExpenseWithCustomSplits = async (householdId: string, description: string, amount: number, splits: Array<{ user_id: string; amount: number }>, date?: string, isRecurring: boolean = false) => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
  if (Math.abs(totalSplits - amount) > 0.01 * splits.length) { throw new Error('Split amounts must approximately equal total expense amount');}
  const finalDescription = isRecurring ? `${description} (Recurring)` : description;
  const { data: expense, error: expenseError } = await supabase.from('expenses').insert({ household_id: householdId, description: finalDescription, amount, paid_by: user.id, date: date || new Date().toISOString().split('T')[0]}).select().single();
  if (expenseError) throw expenseError;
  const splitRecords = splits.map(split => ({ expense_id: expense.id, user_id: split.user_id, amount: split.amount, settled: split.user_id === user.id }));
  const { error: splitsError } = await supabase.from('expense_splits').insert(splitRecords);
  if (splitsError) { throw splitsError; }
  const otherMembers = splits.filter(split => split.user_id !== user.id);
  if (otherMembers.length > 0) { const { data: payerProfile } = await getProfile(user.id); if (payerProfile) { const notifications = otherMembers.map(split => ({ user_id: split.user_id, household_id: householdId, type: 'expense_added' as const, title: 'New Expense Added', message: `${payerProfile.name} added "${description}" - You owe $${split.amount.toFixed(2)}`, data: { expense_id: expense.id, amount: split.amount, payer_id: user.id }, is_read: false })); try { await supabase.from('notifications').insert(notifications) } catch (notifError) { console.error('Failed to create notifications:', notifError)}}}
  return expense;
};

// --- TASK FUNCTIONS (for general tasks, not structured chores) ---
export const createTask = async (householdId: string, title: string, assignedTo?: string): Promise<Task> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser(); if (authError || !user) { throw new Error('Not authenticated'); }
  const { data: membership, error: memberError } = await supabase.from('household_members').select('id').eq('household_id', householdId).eq('user_id', user.id).single(); if (memberError || !membership) { throw new Error('You are not a member of this household');}
  if (assignedTo) { const { data: assigneeMember, error: assigneeError } = await supabase.from('household_members').select('id').eq('household_id', householdId).eq('user_id', assignedTo).single(); if (assigneeError || !assigneeMember) { throw new Error('Assigned user is not a member of this household'); } }
  const taskData: any = { household_id: householdId, title, completed: false }; if (assignedTo) { taskData.assigned_to = assignedTo; }
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


// --- SETTLEMENT FUNCTIONS (unverändert) ---
export const createSettlement = async (householdId: string, payeeId: string, amount: number, description?: string) => {
  const { data: { user } } = await supabase.auth.getUser(); 
  if (!user) throw new Error('Not authenticated');
  
  // Add validation
  if (amount <= 0) throw new Error('Settlement amount must be positive');
  if (payeeId === user.id) throw new Error('Cannot create settlement to yourself');
  
  // Verify both users are in the household
  const { data: members, error: memberError } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)
    .in('user_id', [user.id, payeeId]);
  
  if (memberError || !members || members.length !== 2) {
    throw new Error('Both users must be members of the household');
  }
  
  // Check for recent duplicate
  const recentCutoff = new Date();
  recentCutoff.setMinutes(recentCutoff.getMinutes() - 1);
  
  const { data: recentSettlement } = await supabase
    .from('settlements')
    .select('id', { count: 'exact' }) // Using count is even better
    .eq('household_id', householdId)
    .eq('payer_id', user.id)
    .eq('payee_id', payeeId)
    .eq('amount', amount)
    .gte('created_at', recentCutoff.toISOString());

  if (recentSettlement && recentSettlement.length > 0) { // Check if any duplicates were found
    throw new Error('A similar settlement was just created. Please wait a moment.');
  }

  if (recentSettlement) {
    throw new Error('A similar settlement was just created. Please wait a moment.');
  }
  
  // Get payee name for description
  const { data: payeeProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', payeeId)
    .single();
  
  const finalDescription = description || `Payment to ${payeeProfile?.name || 'member'}`;
  
  const { data, error } = await supabase
    .from('settlements')
    .insert({ 
      household_id: householdId, 
      payer_id: user.id, 
      payee_id: payeeId, 
      amount, 
      description: finalDescription
    })
    .select(`*, payer_profile:payer_id (id, name, avatar_url), payee_profile:payee_id (id, name, avatar_url)`)
    .single();
  
  if (error) throw error;
  
  // Create notification for payee
  const { data: payerProfile } = await getProfile(user.id);
  if (payerProfile) {
    await createNotification(
      payeeId,
      'settlement_recorded',
      'Payment Received',
      `${payerProfile.name} paid you $${amount.toFixed(2)}`,
      householdId,
      { settlement_id: data.id, amount, payer_id: user.id }
    );
  }
  
  return data;
};
export const getHouseholdSettlements = async (householdId: string) => {
  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
      payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
    `)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data || [];
};

// ADD THIS NEW FUNCTION:
export const subscribeToSettlements = (householdId: string, onSettlement: (settlement: Settlement) => void) => {
  const subscription = supabase
    .channel(`settlements:${householdId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'settlements', 
      filter: `household_id=eq.${householdId}`
    }, async (payload) => {
      if (payload.new) {
        const newSettlement = payload.new as Settlement;
        // Fetch profiles for the settlement
        const { data } = await supabase
          .from('settlements')
          .select(`
            *,
            payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
            payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
          `)
          .eq('id', newSettlement.id)
          .single();
        if (data) onSettlement(data);
      }
    })
    .subscribe();
  return subscription;
};


// --- RECURRING EXPENSE FUNCTIONS (unverändert) ---
const calculateNextDueDate = (currentDate: Date, frequency: RecurringExpense['frequency'], dayOfMonth?: number, dayOfWeek?: number): string => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'biweekly': date.setDate(date.getDate() + 14); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); if (dayOfMonth) { const lastDayOfNewMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); date.setDate(Math.min(dayOfMonth, lastDayOfNewMonth));} break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); if (dayOfMonth) { const lastDayOfNewMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); date.setDate(Math.min(dayOfMonth, lastDayOfNewMonth));} break;
    case 'yearly': date.setFullYear(date.getFullYear() + 1); if (dayOfMonth) { const lastDayOfNewMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); date.setDate(Math.min(dayOfMonth, lastDayOfNewMonth));} break;
  }
  return date.toISOString().split('T')[0];
};
export const createRecurringExpense = async (householdId: string, description: string, amount: number, frequency: RecurringExpense['frequency'], startDate: Date, dayOfMonth?: number, dayOfWeek?: number) => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  const nextDueDate = calculateNextDueDate(startDate, frequency, dayOfMonth, dayOfWeek);
  const { data, error } = await supabase.from('recurring_expenses').insert({ household_id: householdId, description, amount, frequency, day_of_month: dayOfMonth, day_of_week: dayOfWeek, next_due_date: nextDueDate, created_by: user.id, is_active: true }).select().single();
  if (error) throw error; return data;
};
export const getHouseholdRecurringExpenses = async (householdId: string) => {
  const { data, error } = await supabase.from('recurring_expenses').select('*').eq('household_id', householdId).eq('is_active', true).order('next_due_date', { ascending: true });
  if (error) throw error; return data || [];
};
export const processDueRecurringExpenses = async (householdId: string) => {
  // Call the new database function once. All the heavy lifting is now done on the server.
  const { error } = await supabase.rpc('process_due_recurring_expenses', {
    p_household_id: householdId,
  });

  if (error) {
    console.error('Error processing due recurring expenses:', error);
    throw error;
  }
};

// --- NOTIFICATION FUNCTIONS (unverändert) ---
export const getNotifications = async (limit = 50, onlyUnread = false) => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  let query = supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
  if (onlyUnread) { query = query.eq('is_read', false); }
  const { data, error } = await query; if (error) throw error; return data || [];
};
export const getUnreadNotificationCount = async () => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.rpc('get_unread_notification_count', { p_user_id: user.id });
  if (error) throw error; return data || 0;
};
export const markNotificationsRead = async (notificationIds: string[]) => {
  const { error } = await supabase.rpc('mark_notifications_read', { p_notification_ids: notificationIds });
  if (error) throw error;
};
export const markAllNotificationsRead = async () => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false);
  if (error) throw error;
};
export const createNotification = async (userId: string, type: Notification['type'], title: string, message: string, householdId?: string, data?: any) => {
  const { data: notification, error } = await supabase.from('notifications').insert({ user_id: userId, household_id: householdId, type, title, message, data: data || {} }).select().single();
  if (error) throw error; return notification;
};
export const subscribeToNotifications = (userId: string, onNotification: (notification: Notification) => void) => {
  const subscription = supabase.channel(`notifications:${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`}, (payload) => { onNotification(payload.new as Notification); }).subscribe();
  return subscription;
};
export const sendPaymentReminder = async (householdId: string, debtorId: string, amount: number) => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  const { data: creditorProfile } = await getProfile(user.id); if (!creditorProfile) throw new Error('Creditor profile not found');
  return createNotification(debtorId, 'payment_reminder', 'Payment Reminder', `${creditorProfile.name} has sent you a reminder: You owe $${amount.toFixed(2)}`, householdId, { amount, creditor_id: user.id, manual_reminder: true });
};

// --- BALANCE & SETTLEMENT HELPERS (unverändert) ---
// REPLACE THE ENTIRE FUNCTION:
export const calculateBalances = (expenses: Expense[], members: HouseholdMember[], settlements?: Settlement[]): { userId: string; balance: number; profile: Profile }[] => {
  const balanceMap = new Map<string, number>();
  
  // Initialize all members with 0 balance (skip placeholders)
  members.forEach(member => {
    if (member.user_id && !member.user_id.startsWith('placeholder_')) {
      balanceMap.set(member.user_id, 0);
    }
  });
  
  // Process expenses
  expenses.forEach(expense => {
    if (!expense.paid_by || !balanceMap.has(expense.paid_by)) return;
    
    const payerBalance = balanceMap.get(expense.paid_by) || 0;
    balanceMap.set(expense.paid_by, payerBalance + expense.amount);
    
    expense.expense_splits?.forEach(split => {
      if (!split.settled && split.user_id && balanceMap.has(split.user_id)) {
        const currentBalance = balanceMap.get(split.user_id) || 0;
        balanceMap.set(split.user_id, currentBalance - split.amount);
      }
    });
  });
  
  // Process settlements with validation
  if (settlements) {
    settlements.forEach(settlement => {
      if (!settlement.payer_id || !settlement.payee_id || settlement.amount <= 0) return;
      
      if (balanceMap.has(settlement.payer_id)) {
        const payerBalance = balanceMap.get(settlement.payer_id) || 0;
        balanceMap.set(settlement.payer_id, payerBalance - settlement.amount);
      }
      
      if (balanceMap.has(settlement.payee_id)) {
        const payeeBalance = balanceMap.get(settlement.payee_id) || 0;
        balanceMap.set(settlement.payee_id, payeeBalance + settlement.amount);
      }
    });
  }
  
  // Convert to array and filter out invalid entries
  return Array.from(balanceMap.entries())
    .map(([userId, balance]) => {
      const member = members.find(m => m.user_id === userId);
      if (!member?.profiles) {
        console.warn(`Profile not found for user ID: ${userId} in calculateBalances.`);
        return null;
      }
      return {
        userId,
        balance: Math.round(balance * 100) / 100,
        profile: member.profiles
      };
    })
    .filter(Boolean) as { userId: string; balance: number; profile: Profile }[];
};
export const getSettlementSuggestions = (balances: ReturnType<typeof calculateBalances>): { from: string; to: string; amount: number; fromProfile: Profile; toProfile: Profile }[] => {
  const suggestions: { from: string; to: string; amount: number; fromProfile: Profile; toProfile: Profile }[] = [];
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const tempDebtors = [...debtors]; const tempCreditors = [...creditors];
  while (tempDebtors.length > 0 && tempCreditors.length > 0) {
    const debtor = tempDebtors[0]; const creditor = tempCreditors[0];
    if (!debtor.profile || !creditor.profile) { console.warn('Skipping settlement suggestion due to missing profile information.'); if (!debtor.profile) tempDebtors.shift(); if (!creditor.profile) tempCreditors.shift(); continue; }
    const debtAmount = Math.abs(debtor.balance); const creditAmount = creditor.balance; const settlementAmount = Math.min(debtAmount, creditAmount);
    suggestions.push({ from: debtor.userId, to: creditor.userId, amount: Math.round(settlementAmount * 100) / 100, fromProfile: debtor.profile, toProfile: creditor.profile });
    debtor.balance += settlementAmount; creditor.balance -= settlementAmount;
    if (Math.abs(debtor.balance) < 0.01) tempDebtors.shift(); if (creditor.balance < 0.01) tempCreditors.shift();
  }
  return suggestions;
};

// --- MESSAGE FUNCTIONS (unverändert) ---
export const sendMessage = async (householdId: string, content: string): Promise<Message> => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('messages').insert({ household_id: householdId, user_id: user.id, content: content.trim() }).select().single(); if (error) throw error;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { ...data, profiles: profile || undefined } as Message;
};
export const getHouseholdMessages = async (householdId: string, limit = 50, before?: string): Promise<Message[]> => {
  const { data, error } = await supabase.rpc('get_messages_with_profiles', { p_household_id: householdId, p_limit: limit, p_before: before }); if (error) throw error;
  return ((data || []) as MessageWithProfileRPC[]).map((msg: MessageWithProfileRPC) => ({ ...msg, profiles: msg.profile })).reverse();
};
export const subscribeToMessages = (householdId: string, onMessage: (message: Message) => void) => {
  const subscription = supabase.channel(`messages:${householdId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `household_id=eq.${householdId}`}, async (payload) => { if (payload.new && payload.new.household_id === householdId) { const newMessage = payload.new as Message; const { data: profile } = await supabase.from('profiles').select('*').eq('id', newMessage.user_id).single(); const messageWithProfile: Message = { ...newMessage, profiles: profile || undefined }; onMessage(messageWithProfile); }}).subscribe();
  return subscription;
};

// --- NEW CHORE API FUNCTIONS ---

/**
 * Initializes chores for a household based on its core_chores list.
 * Creates HouseholdChore entries if they don't exist.
 * Then, triggers the first assignment cycle.
 */
export const initializeChoresForHousehold = async (householdId: string, householdData?: Household): Promise<void> => {
  const household = householdData || await getHouseholdDetails(householdId);
  if (!household || !household.core_chores || household.core_chores.length === 0) {
    console.log(`No core chores to initialize for household ${householdId}`);
    return;
  }

  const { data: existingChores, error: fetchError } = await supabase
    .from('household_chores')
    .select('name')
    .eq('household_id', householdId)
    .in('name', household.core_chores);

  if (fetchError) {
    console.error('Error fetching existing household chores:', fetchError);
    throw fetchError;
  }

  const existingChoreNames = existingChores?.map(c => c.name) || [];
  const choresToCreate = household.core_chores
    .filter(coreChoreName => !existingChoreNames.includes(coreChoreName))
    .map((name, index) => ({
      household_id: householdId,
      name,
      is_core_chore: true,
      is_active: true,
      default_order: index, // Simple ordering for now
    }));

  if (choresToCreate.length > 0) {
    const { error: insertError } = await supabase.from('household_chores').insert(choresToCreate);
    if (insertError) {
      console.error('Error inserting new core chores:', insertError);
      throw insertError;
    }
  }
  // After ensuring chore definitions exist, make the first assignments.
  await assignChoresForCurrentCycle(householdId, household);
};

/**
 * Assigns chores for the current/next cycle based on household settings.
 * This is the core rotation and assignment logic.
 */
export const assignChoresForCurrentCycle = async (householdId: string, householdOverride?: Household): Promise<ChoreAssignment[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const household = householdOverride || await getHouseholdDetails(householdId);
  if (!household) throw new Error('Household not found');

  const members = await getHouseholdMembers(householdId);
  if (members.length === 0) {
      // No actual members yet, create placeholder assignments if member_count is set
      if(household.member_count && household.member_count > 0) {
          // We'll handle placeholder display on the UI side for now,
          // or create placeholder assignments if the DB schema supports it (e.g. assigned_user_id is nullable)
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

  if (choresError || !choresDefinitions || choresDefinitions.length === 0) {
    console.error('No active chores defined for this household or error fetching them:', choresError);
    return [];
  }
  
  const frequency = household.chore_frequency || 'Weekly';
  const framework = household.chore_framework || 'Split';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  let cycleStartDate: Date;
  if (household.next_chore_rotation_date && new Date(household.next_chore_rotation_date) > today) {
      // If next rotation is in the future, means current assignments are still valid or it's the very first run.
      // For MVP, we'll simplify and assume if next_rotation_date is present and future, we don't re-assign yet.
      // A more robust system would check if it's time to rotate.
      // For now, let's assume this function is called when rotation *is* due or for initialization.
      cycleStartDate = household.last_chore_rotation_date ? new Date(household.last_chore_rotation_date) : today;
      // If last_chore_rotation_date is null, it's the first time, start today.
  } else {
      cycleStartDate = today; // Default to today if no rotation info or past due
  }


  let dueDate = new Date(cycleStartDate);
  switch (frequency) {
    case 'Daily': dueDate.setDate(cycleStartDate.getDate() + 1); break;
    case 'Weekly': dueDate.setDate(cycleStartDate.getDate() + 7); break;
    case 'Bi-weekly': dueDate.setDate(cycleStartDate.getDate() + 14); break;
    case 'Monthly': dueDate.setMonth(cycleStartDate.getMonth() + 1); break;
    default: dueDate.setDate(cycleStartDate.getDate() + 7); // Default to weekly
  }
  dueDate.setHours(23, 59, 59, 999); // Due at the end of the day

  const newAssignments: Omit<ChoreAssignment, 'id' | 'created_at' | 'updated_at'>[] = [];
  
  // Placeholder user IDs if not enough real members
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
  } else { // Split framework
    choresDefinitions.forEach((choreDef, index) => {
      // Rotate through members for each chore
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
    // For 'Split', the next rotation might involve shifting all assignments, or a more complex scheme.
    // For MVP, we'll effectively restart the "round robin" from the household's chore_current_assignee_index
    // For the next cycle, this index needs to be updated if we want a different starting point.
    // Or, if 'Split' means each chore rotates independently, that's more complex.
    // Let's simplify: for 'Split', the current_assignee_index effectively means the starting member for the list of chores.
    // And this index itself rotates.
     currentAssigneeIndex = (currentAssigneeIndex + 1) % memberIdsForAssignment.length;
  }

  // Delete old pending assignments for this cycle before inserting new ones
  // to prevent duplicates if this function is run multiple times for the same cycle start.
  // A more robust approach might be to update existing pending or use an upsert.
  const { error: deleteError } = await supabase
    .from('chore_assignments')
    .delete()
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .gte('cycle_start_date', cycleStartDate.toISOString().split('T')[0]); // Only clear future/current pending

  if (deleteError) {
      console.warn("Could not clear old pending assignments:", deleteError);
      // Decide if this is critical. For now, we'll proceed.
  }

  const { data: insertedAssignments, error: insertAssignmentsError } = await supabase
    .from('chore_assignments')
    .insert(newAssignments)
    .select();

  if (insertAssignmentsError) {
    console.error('Error inserting new chore assignments:', insertAssignmentsError);
    throw insertAssignmentsError;
  }

  // Update household's rotation dates
  const { error: updateHouseholdError } = await supabase
    .from('households')
    .update({ 
        last_chore_rotation_date: cycleStartDate.toISOString().split('T')[0],
        next_chore_rotation_date: dueDate.toISOString().split('T')[0], // Next rotation starts when current cycle is due
        chore_current_assignee_index: currentAssigneeIndex 
    })
    .eq('id', householdId);

  if (updateHouseholdError) {
    console.error('Error updating household rotation dates:', updateHouseholdError);
    // Non-critical for assignment itself, but impacts future rotations
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
    .eq('status', 'pending') // Typically, you want to see pending chores
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

// Function to add a new (non-core) chore definition to a household
export const addCustomChoreToHousehold = async (householdId: string, name: string, description?: string): Promise<HouseholdChore | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user is part of the household (optional, but good practice)
    // ...

    const { data: newChore, error } = await supabase
        .from('household_chores')
        .insert({
            household_id: householdId,
            name,
            description,
            is_core_chore: false, // Custom chores are not core by default
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding custom chore:", error);
        throw error;
    }
    // After adding, you might want to re-trigger assignChoresForCurrentCycle if it should be immediately included
    // For now, it will be picked up in the next cycle.
    return newChore;
};

/**
 * Gets the chore rotation schedule for display purposes.
 * For MVP, this will show the current assignments. A more complex version would project future rotations.
 */
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

// Function to check if chore rotation is due and trigger it
export const checkAndTriggerChoreRotation = async (householdId: string): Promise<boolean> => {
  const household = await getHouseholdDetails(householdId);
  if (!household) return false;

  const today = new Date();
  today.setHours(0,0,0,0);

  if (household.next_chore_rotation_date) {
    const nextRotationDate = new Date(household.next_chore_rotation_date);
    nextRotationDate.setHours(0,0,0,0); // Normalize

    if (today >= nextRotationDate) {
      console.log(`Chore rotation due for household ${householdId}. Triggering...`);
      await assignChoresForCurrentCycle(householdId, household);
      return true; // Rotation was triggered
    }
  } else {
    // No next_chore_rotation_date, likely first time or needs initialization
    console.log(`Initial chore assignment or re-initialization for household ${householdId}.`);
    await initializeChoresForHousehold(householdId, household); //This will also call assignChores
    return true; // Initialization/Assignment was triggered
  }
  return false; // No rotation needed
};