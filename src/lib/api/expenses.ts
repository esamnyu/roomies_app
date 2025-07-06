import { z } from 'zod';
import { supabase } from '../supabase';
import type { RecurringExpense, Expense } from '../types/types';
import { getProfile } from './profile';
import { requireExpenseAccess } from './auth/middleware';

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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  version: z.number().optional() // For optimistic concurrency
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
      ),
      expense_payments (*, profiles:payer_id(id, name, avatar_url))
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

// NOTE: getHouseholdBalances is now exported from settlements.ts to avoid duplication

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

// UPDATED: Use the new atomic expense creation
export const createExpenseWithCustomSplits = async (
  householdId: string,
  description: string,
  amount: number,
  splits: Array<{ user_id: string; amount: number }>,
  date?: string,
  paidById?: string,
  clientUuid?: string // For idempotency
): Promise<{ id: string; idempotent: boolean }> => {
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
  
  // Use the NEW atomic RPC function
  const { data, error } = await supabase.rpc('create_expense_atomic', {
    p_household_id: validated.householdId,
    p_description: validated.description,
    p_amount: validated.amount,
    p_payments: [{ payer_id: payerId, amount: validated.amount }], // Single payer
    p_splits: validated.splits,
    p_date: validated.date || new Date().toISOString().split('T')[0],
    p_client_uuid: clientUuid || null
  });

  if (error) {
    throw new ExpenseError(`Failed to create expense: ${error.message}`, 'CREATE_ERROR');
  }

  // Notifications are now handled by the trigger
  // No need for async notification creation

  return { 
    id: data.expense_id, 
    idempotent: data.idempotent 
  };
};

// NEW: Create multi-payer expense
export const createMultiPayerExpense = async (
  householdId: string,
  description: string,
  payments: Array<{ payer_id: string; amount: number }>,
  splits: Array<{ user_id: string; amount: number }>,
  date?: string,
  clientUuid?: string
): Promise<{ id: string; idempotent: boolean }> => {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  validateSplitTotal(splits, totalAmount);
  
  // Validate payment total
  const paymentSum = payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(paymentSum - totalAmount) > 0.01) {
    throw new ExpenseError('Payment amounts must equal total amount', 'INVALID_PAYMENT_TOTAL');
  }
  
  const { data, error } = await supabase.rpc('create_expense_atomic', {
    p_household_id: householdId,
    p_description: description,
    p_amount: totalAmount,
    p_payments: payments,
    p_splits: splits,
    p_date: date || new Date().toISOString().split('T')[0],
    p_client_uuid: clientUuid || null
  });

  if (error) {
    throw new ExpenseError(`Failed to create multi-payer expense: ${error.message}`, 'CREATE_ERROR');
  }

  return { 
    id: data.expense_id, 
    idempotent: data.idempotent 
  };
};

// UPDATED: Use the new adjustment-aware update
interface UpdateExpensePayload {
  description: string;
  amount: number;
  splits: Array<{ user_id: string; amount: number }>;
  paid_by: string;
  date: string;
  version?: number; // For optimistic concurrency
}

interface UpdateExpenseResponse {
  success: boolean;
  version: number;
  message: string;
}

export const updateExpense = async (
  expenseId: string, 
  payload: UpdateExpensePayload
): Promise<UpdateExpenseResponse> => {
  const validatedId = z.string().uuid().parse(expenseId);
  const validated = UpdateExpenseSchema.parse(payload);
  
  // Check authorization
  const accessInfo = await requireExpenseAccess(validatedId);
  
  if (!accessInfo.canEdit) {
    throw new ExpenseError('You do not have permission to edit this expense', 'AUTHORIZATION_ERROR');
  }
  
  validateSplitTotal(validated.splits, validated.amount);
  
  // Use the update RPC with adjustments (using the p_paid_by version)
  const { data, error } = await supabase.rpc('update_expense_with_adjustments', {
    p_expense_id: validatedId,
    p_description: validated.description,
    p_amount: validated.amount,
    p_paid_by: validated.paid_by,
    p_date: validated.date,
    p_splits: validated.splits,
    p_version: validated.version || null
  });

  if (error) {
    if (error.message.includes('modified by another user')) {
      throw new ExpenseError('Expense was modified by another user. Please refresh and try again.', 'CONCURRENT_UPDATE');
    }
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
  dayOfMonth: z.number().min(1).max(31).optional(),
  splits: z.array(ExpenseSplitSchema).optional() // Custom splits
});

export const createRecurringExpense = async (
  householdId: string, 
  description: string, 
  amount: number, 
  frequency: RecurringExpense['frequency'], 
  startDate: Date, 
  dayOfMonth?: number,
  splits?: Array<{ user_id: string; amount: number }>
): Promise<RecurringExpense> => {
  const validated = RecurringExpenseSchema.parse({
    householdId,
    description,
    amount,
    frequency,
    startDate,
    dayOfMonth,
    splits
  });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new ExpenseError('Not authenticated', 'AUTH_ERROR');
  }
  
  // Validate custom splits if provided
  if (validated.splits) {
    validateSplitTotal(validated.splits, validated.amount);
  }
  
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({ 
      household_id: validated.householdId, 
      description: validated.description, 
      amount: validated.amount, 
      frequency: validated.frequency, 
      day_of_month: validated.dayOfMonth, 
      next_due_date: validated.startDate.toISOString().split('T')[0], 
      created_by: user.id, 
      is_active: true,
      splits: validated.splits || null // Store custom splits
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

// UPDATED: Use the new robust recurring expense processor
export const processDueRecurringExpenses = async (householdId: string): Promise<{ processed: number; errors: number }> => {
  const validatedId = z.string().uuid().parse(householdId);
  
  const { data, error } = await supabase.rpc('process_recurring_expenses_robust', {
    p_household_id: validatedId,
    p_batch_size: 100
  });

  if (error) {
    throw new ExpenseError(`Failed to process recurring expenses: ${error.message}`, 'PROCESS_ERROR');
  }

  return {
    processed: data.processed || 0,
    errors: data.errors || 0
  };
};

// Toggle recurring expense active status
export const toggleRecurringExpense = async (recurringExpenseId: string, isActive: boolean): Promise<RecurringExpense> => {
  const validatedId = z.string().uuid().parse(recurringExpenseId);
  
  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({ is_active: isActive })
    .eq('id', validatedId)
    .select()
    .single();
    
  if (error) {
    throw new ExpenseError(`Failed to toggle recurring expense: ${error.message}`, 'UPDATE_ERROR');
  }
  
  return data;
};

// Delete recurring expense
export const deleteRecurringExpense = async (recurringExpenseId: string): Promise<{ success: boolean }> => {
  const validatedId = z.string().uuid().parse(recurringExpenseId);
  
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', validatedId);
    
  if (error) {
    throw new ExpenseError(`Failed to delete recurring expense: ${error.message}`, 'DELETE_ERROR');
  }
  
  return { success: true };
};

// Delete expense with proper ledger handling
export const deleteExpense = async (expenseId: string): Promise<{ success: boolean; message: string }> => {
  const validatedId = z.string().uuid().parse(expenseId);
  
  // Call the database function that handles deletion with ledger updates
  // It will check permissions and handle both settled and unsettled expenses
  const { data, error } = await supabase.rpc('delete_expense_with_ledger', {
    p_expense_id: validatedId
  });
  
  if (error) {
    throw new ExpenseError(`Failed to delete expense: ${error.message}`, 'DELETE_ERROR');
  }
  
  if (!data?.success) {
    throw new ExpenseError(data?.message || 'Failed to delete expense', 'DELETE_ERROR');
  }
  
  return {
    success: true,
    message: data.message || 'Expense deleted successfully'
  };
};