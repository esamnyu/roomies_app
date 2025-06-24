import { supabase } from '../supabase';
import type { RecurringExpense } from '../types/types';
import { getProfile } from './profile';

// --- EXPENSE FUNCTIONS ---
export const getHouseholdExpenses = async (householdId: string) => {
  const { data, error } = await supabase
    .from('expenses')
    // --- MODIFIED LINE START ---
    .select(`
      *, 
      profiles:paid_by (id, name, avatar_url), 
      expense_splits (*, 
        profiles:user_id (id, name, avatar_url),
        expense_split_adjustments (*, profiles:created_by(id, name, avatar_url))
      )
    `)
    // --- MODIFIED LINE END ---
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const markExpenseSettled = async (expenseId: string, userId: string) => {
  const { data, error } = await supabase
    .from('expense_splits')
    .update({ settled: true, settled_at: new Date().toISOString() })
    .eq('expense_id', expenseId)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
};

export const createExpenseWithCustomSplits = async (
  householdId: string,
  description: string,
  amount: number,
  splits: Array<{ user_id: string; amount: number }>,
  date?: string,
  paidById?: string
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
  if (Math.abs(totalSplits - amount) > 0.01 * splits.length) {
    throw new Error('Split amounts must approximately equal total expense amount');
  }

  const payerId = paidById || user.id;

  const { data: expenseId, error } = await supabase.rpc('create_expense_with_splits', {
    p_household_id: householdId,
    p_description: description,
    p_amount: amount,
    p_paid_by: payerId,
    p_splits: splits,
    p_date: date || new Date().toISOString().split('T')[0]
  });

  if (error) {
    console.error("Error calling create_expense_with_splits RPC:", error);
    throw new Error(`Failed to create expense: ${error.message}`);
  }

  const otherMembers = splits.filter(split => split.user_id !== payerId);
  if (otherMembers.length > 0) {
    const payerProfile = await getProfile(payerId);
    if (payerProfile) {
      const notifications = otherMembers.map(split => ({
        user_id: split.user_id,
        household_id: householdId,
        type: 'expense_added' as const,
        title: 'New Expense Added',
        message: `${payerProfile.name} added "${description}" - You owe $${split.amount.toFixed(2)}`,
        data: { expense_id: expenseId, amount: split.amount, payer_id: payerId },
        is_read: false
      }));
      try {
        await supabase.from('notifications').insert(notifications);
      } catch (notifError) {
        console.error('Failed to create notifications (expense was still created):', notifError);
      }
    }
  }

  return { id: expenseId };
};

// --- MODIFIED SECTION START ---

// Payload for the update function
interface UpdateExpensePayload {
  description: string;
  amount: number;
  splits: Array<{ user_id: string; amount: number }>;
  paid_by: string; // Ensure paid_by is always provided
  date: string;    // Ensure date is always provided
}

// Define the expected response type from the new RPC
interface UpdateExpenseResponse {
  success: boolean;
  adjustments_made: boolean;
  message: string;
}

export const updateExpense = async (expenseId: string, payload: UpdateExpensePayload): Promise<UpdateExpenseResponse> => {
  // Call the new 'update_expense_with_splits_smart' RPC
  const { data, error } = await supabase.rpc('update_expense_with_splits_smart', {
    p_expense_id: expenseId,
    p_description: payload.description,
    p_amount: payload.amount,
    p_splits: payload.splits,
    p_paid_by: payload.paid_by,
    p_date: payload.date
  });

  if (error) {
    console.error("Error updating expense:", error);
    throw new Error(`Failed to update expense: ${error.message}`);
  }

  // Return the data from the RPC, which includes the 'adjustments_made' flag
  return data;
};

// --- MODIFIED SECTION END ---


// --- RECURRING EXPENSE FUNCTIONS (unchanged) ---

const calculateNextDueDate = (currentDate: Date, frequency: RecurringExpense['frequency'], dayOfMonth?: number): string => {
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

export const createRecurringExpense = async (householdId: string, description: string, amount: number, frequency: RecurringExpense['frequency'], startDate: Date, dayOfMonth?: number) => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  const nextDueDate = calculateNextDueDate(startDate, frequency, dayOfMonth);
  const { data, error } = await supabase.from('recurring_expenses').insert({ household_id: householdId, description, amount, frequency, day_of_month: dayOfMonth, next_due_date: nextDueDate, created_by: user.id, is_active: true }).select().single();
  if (error) throw error; return data;
};

export const getHouseholdRecurringExpenses = async (householdId: string) => {
  const { data, error } = await supabase.from('recurring_expenses').select('*').eq('household_id', householdId).eq('is_active', true).order('next_due_date', { ascending: true });
  if (error) throw error; return data || [];
};

export const processDueRecurringExpenses = async (householdId:string) => {
    const { error } = await supabase.rpc('process_due_recurring_expenses', {
        p_household_id: householdId,
    });

    if (error) {
        console.error('Error processing due recurring expenses:', error);
        throw error;
    }
};
