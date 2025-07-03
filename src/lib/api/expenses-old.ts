import { z } from 'zod';
import { supabase } from '../supabase';
import type { RecurringExpense, Expense } from '../types/types';
import { getProfile } from './profile';

// --- VALIDATION SCHEMAS ---
const ExpenseSplitSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  amount: z.number().nonnegative().max(999999.99, 'Amount too large')
});

const CreateExpenseSchema = z.object({
  householdId: z.string().uuid('Invalid household ID'),
  description: z.string().min(1, 'Description required').max(200, 'Description too long'),
  amount: z.number().positive('Amount must be positive').max(999999.99, 'Amount too large'),
  splits: z.array(ExpenseSplitSchema).min(1, 'At least one split required').max(50, 'Too many splits'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  paidById: z.string().uuid('Invalid payer ID').optional()
});

const UpdateExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive().max(999999.99),
  splits: z.array(ExpenseSplitSchema).min(1).max(50),
  paid_by: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

// --- CUSTOM ERROR CLASSES ---
class ExpenseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ExpenseError';
  }
}

// --- HELPER FUNCTIONS ---
const validateSplitTotal = (splits: Array<{ amount: number }>, totalAmount: number) => {
  const splitSum = splits.reduce((sum, split) => sum + split.amount, 0);
  const difference = Math.abs(splitSum - totalAmount);
  
  if (difference > 0.01 * splits.length) {
    throw new ExpenseError(
      `Split amounts ($${splitSum.toFixed(2)}) must equal total amount ($${totalAmount.toFixed(2)})`,
      'INVALID_SPLIT_TOTAL'
    );
  }
};

// --- EXPENSE FUNCTIONS ---
export const getHouseholdExpenses = async (householdId: string): Promise<Expense[]> => {
  const validatedId = z.string().uuid().parse(householdId);
  
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *, 
      profiles:paid_by (id, name, avatar_url), 
      expense_splits (*, 
        profiles:user_id (id, name, avatar_url),
        expense_split_adjustments (*, profiles:created_by(id, name, avatar_url))
      )
    `)
    .eq('household_id', validatedId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new ExpenseError(`Failed to fetch expenses: ${error.message}`, 'FETCH_ERROR');
  }
  
  return data || [];
};

export const markExpenseSettled = async (expenseId: string, userId: string) => {
  const validatedExpenseId = z.string().uuid().parse(expenseId);
  const validatedUserId = z.string().uuid().parse(userId);
  
  const { data, error } = await supabase
    .from('expense_splits')
    .update({ 
      settled: true, 
      settled_at: new Date().toISOString() 
    })
    .eq('expense_id', validatedExpenseId)
    .eq('user_id', validatedUserId)
    .select();

  if (error) {
    throw new ExpenseError(`Failed to mark expense as settled: ${error.message}`, 'UPDATE_ERROR');
  }
  
  return data;
};

export const createExpenseWithCustomSplits = async (
  householdId: string,
  description: string,
  amount: number,
  splits: Array<{ user_id: string; amount: number }>,
  date?: string,
  paidById?: string
): Promise<{ id: string }> => {
  // Validate all inputs
  const validated = CreateExpenseSchema.parse({
    householdId,
    description,
    amount,
    splits,
    date,
    paidById
  });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new ExpenseError('Not authenticated', 'AUTH_ERROR');
  }
  
  validateSplitTotal(validated.splits, validated.amount);
  
  const payerId = validated.paidById || user.id;
  
  // Use the existing RPC function
  const { data: expenseId, error } = await supabase.rpc('create_expense_with_splits', {
    p_household_id: validated.householdId,
    p_description: validated.description,
    p_amount: validated.amount,
    p_paid_by: payerId,
    p_splits: validated.splits,
    p_date: validated.date || new Date().toISOString().split('T')[0]
  });

  if (error) {
    throw new ExpenseError(`Failed to create expense: ${error.message}`, 'CREATE_ERROR');
  }

  // Send notifications asynchronously
  createExpenseNotifications(
    validated.householdId,
    payerId,
    validated.description,
    validated.splits
  ).catch(console.error);

  return { id: expenseId };
};

// Update expense with the existing smart RPC
interface UpdateExpensePayload {
  description: string;
  amount: number;
  splits: Array<{ user_id: string; amount: number }>;
  paid_by: string;
  date: string;
}

interface UpdateExpenseResponse {
  success: boolean;
  adjustments_made: boolean;
  message: string;
}

export const updateExpense = async (
  expenseId: string, 
  payload: UpdateExpensePayload
): Promise<UpdateExpenseResponse> => {
  // Validate expense ID
  const validatedId = z.string().uuid().parse(expenseId);
  
  // Validate payload
  const validated = UpdateExpenseSchema.parse(payload);
  
  // Validate split totals
  validateSplitTotal(validated.splits, validated.amount);
  
  // Use the existing smart update RPC
  const { data, error } = await supabase.rpc('update_expense_with_splits_smart', {
    p_expense_id: validatedId,
    p_description: validated.description,
    p_amount: validated.amount,
    p_splits: validated.splits,
    p_paid_by: validated.paid_by,
    p_date: validated.date
  });

  if (error) {
    throw new ExpenseError(`Failed to update expense: ${error.message}`, 'UPDATE_ERROR');
  }

  return data;
};

// --- RECURRING EXPENSE FUNCTIONS ---
const RecurringExpenseSchema = z.object({
  householdId: z.string().uuid(),
  description: z.string().min(1).max(200),
  amount: z.number().positive().max(999999.99),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.date(),
  dayOfMonth: z.number().min(1).max(31).optional()
});

const calculateNextDueDate = (
  currentDate: Date, 
  frequency: RecurringExpense['frequency'], 
  dayOfMonth?: number
): string => {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly': 
      date.setDate(date.getDate() + 7); 
      break;
    case 'biweekly': 
      date.setDate(date.getDate() + 14); 
      break;
    case 'monthly': 
      date.setMonth(date.getMonth() + 1); 
      if (dayOfMonth) { 
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); 
        date.setDate(Math.min(dayOfMonth, lastDay));
      } 
      break;
    case 'quarterly': 
      date.setMonth(date.getMonth() + 3); 
      if (dayOfMonth) { 
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); 
        date.setDate(Math.min(dayOfMonth, lastDay));
      } 
      break;
    case 'yearly': 
      date.setFullYear(date.getFullYear() + 1); 
      if (dayOfMonth && date.getMonth() === 1) { // Handle Feb 29
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); 
        date.setDate(Math.min(dayOfMonth, lastDay));
      }
      break;
  }
  
  return date.toISOString().split('T')[0];
};

export const createRecurringExpense = async (
  householdId: string, 
  description: string, 
  amount: number, 
  frequency: RecurringExpense['frequency'], 
  startDate: Date, 
  dayOfMonth?: number
): Promise<RecurringExpense> => {
  const validated = RecurringExpenseSchema.parse({
    householdId,
    description,
    amount,
    frequency,
    startDate,
    dayOfMonth
  });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new ExpenseError('Not authenticated', 'AUTH_ERROR');
  }
  
  const nextDueDate = calculateNextDueDate(validated.startDate, validated.frequency, validated.dayOfMonth);
  
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({ 
      household_id: validated.householdId, 
      description: validated.description, 
      amount: validated.amount, 
      frequency: validated.frequency, 
      day_of_month: validated.dayOfMonth, 
      next_due_date: nextDueDate, 
      created_by: user.id, 
      is_active: true 
    })
    .select()
    .single();
    
  if (error) {
    throw new ExpenseError(`Failed to create recurring expense: ${error.message}`, 'CREATE_ERROR');
  }
  
  return data;
};

export const getHouseholdRecurringExpenses = async (householdId: string): Promise<RecurringExpense[]> => {
  const validatedId = z.string().uuid().parse(householdId);
  
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('household_id', validatedId)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true })
    .limit(50);
    
  if (error) {
    throw new ExpenseError(`Failed to fetch recurring expenses: ${error.message}`, 'FETCH_ERROR');
  }
  
  return data || [];
};

// Keep this since it uses an existing RPC
export const processDueRecurringExpenses = async (householdId: string): Promise<void> => {
  const validatedId = z.string().uuid().parse(householdId);
  
  const { error } = await supabase.rpc('process_due_recurring_expenses', {
    p_household_id: validatedId,
  });

  if (error) {
    throw new ExpenseError(`Failed to process recurring expenses: ${error.message}`, 'PROCESS_ERROR');
  }
};

// Async notification helper
async function createExpenseNotifications(
  householdId: string,
  payerId: string,
  description: string,
  splits: Array<{ user_id: string; amount: number }>
): Promise<void> {
  const otherMembers = splits.filter(split => split.user_id !== payerId);
  if (otherMembers.length === 0) return;
  
  const payerProfile = await getProfile(payerId);
  if (!payerProfile) return;
  
  const notifications = otherMembers.map(split => ({
    user_id: split.user_id,
    household_id: householdId,
    type: 'expense_added' as const,
    title: 'New Expense Added',
    message: `${payerProfile.name} added "${description}" - You owe $${split.amount.toFixed(2)}`,
    data: { amount: split.amount, payer_id: payerId },
    is_read: false
  }));
  
  await supabase.from('notifications').insert(notifications);
}