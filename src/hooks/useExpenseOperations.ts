import { useState, useCallback } from 'react';
import { 
  createExpenseWithCustomSplits, 
  createMultiPayerExpense,
  updateExpense as updateExpenseAPI,
  deleteExpense,
  createRecurringExpense 
} from '@/lib/api/expenses';
import { toast } from 'react-hot-toast';
import type { Expense } from '@/lib/types/types';

interface ExpenseFormData {
  description: string;
  amount: number;
  date: string;
  category?: string;
  splitMode: 'equal' | 'custom' | 'percentage' | 'by_amount';
  payers: Array<{ userId: string; amount: number }>;
  splits: Array<{ userId: string; amount: number; percentage?: number }>;
  isRecurring: boolean;
  recurringConfig?: {
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    dayOfMonth?: number;
    dayOfWeek?: number;
  };
}

export const useExpenseOperations = (householdId: string, onRefresh?: () => void) => {
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create expense
  const createExpense = useCallback(async (data: ExpenseFormData) => {
    setError(null);
    setIsCreating(true);
    
    try {
      // Handle recurring expense
      if (data.isRecurring && data.recurringConfig) {
        await createRecurringExpense(
          householdId,
          data.description,
          data.amount,
          data.recurringConfig.frequency,
          new Date(data.date),
          data.recurringConfig.dayOfMonth,
          data.splits.map(s => ({ user_id: s.userId, amount: s.amount }))
        );
        toast.success('Recurring expense created successfully');
      }
      // Handle multi-payer expense
      else if (data.payers.length > 1) {
        await createMultiPayerExpense(
          householdId,
          data.description,
          data.payers.map(p => ({ payer_id: p.userId, amount: p.amount })),
          data.splits.map(s => ({ user_id: s.userId, amount: s.amount })),
          data.date
        );
        toast.success('Multi-payer expense created successfully');
      }
      // Handle single-payer expense
      else {
        const paidById = data.payers[0]?.userId;
        if (!paidById) {
          throw new Error('At least one payer is required');
        }

        await createExpenseWithCustomSplits(
          householdId,
          data.description,
          data.amount,
          data.splits.map(s => ({ user_id: s.userId, amount: s.amount })),
          data.date,
          paidById
        );
        toast.success('Expense added successfully');
      }
      
      // Refresh data if callback provided
      onRefresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create expense';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [householdId, onRefresh]);

  // Update expense
  const updateExpense = useCallback(async ({ expenseId, data }: { expenseId: string; data: ExpenseFormData }) => {
    setError(null);
    setIsUpdating(true);
    
    try {
      // For now, we only support single-payer updates
      const paidById = data.payers[0]?.userId;
      if (!paidById) {
        throw new Error('At least one payer is required');
      }

      await updateExpenseAPI(expenseId, {
        description: data.description,
        amount: data.amount,
        splits: data.splits.map(s => ({ user_id: s.userId, amount: s.amount })),
        paid_by: paidById,
        date: data.date,
        category: data.category
      });
      
      toast.success('Expense updated successfully');
      onRefresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update expense';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [onRefresh]);

  // Delete expense
  const deleteExpenseFn = useCallback(async (expenseId: string) => {
    setError(null);
    setIsDeleting(true);
    
    try {
      const result = await deleteExpense(expenseId);
      
      // Show appropriate message based on whether expense was reversed
      if (result.message.includes('reversed')) {
        toast.success('Settled expense has been reversed. The ledger has been updated accordingly.');
      } else {
        toast.success('Expense deleted successfully');
      }
      
      onRefresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete expense';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [onRefresh]);

  // Helper to convert expense to form data
  const expenseToFormData = useCallback((expense: Expense): ExpenseFormData => {
    const totalAmount = expense.amount;
    const payers = expense.expense_payments?.length > 0
      ? expense.expense_payments.map(p => ({
          userId: p.payer_id,
          amount: p.amount
        }))
      : [{ userId: expense.paid_by, amount: totalAmount }];

    const splits = expense.expense_splits?.map(s => ({
      userId: s.user_id,
      amount: s.amount,
      percentage: totalAmount > 0 ? (s.amount / totalAmount) * 100 : 0
    })) || [];

    return {
      description: expense.description,
      amount: totalAmount,
      date: expense.date,
      category: expense.category,
      splitMode: 'custom', // Default to custom for existing expenses
      payers,
      splits,
      isRecurring: false,
      recurringConfig: undefined
    };
  }, []);

  // Helper to duplicate an expense
  const duplicateExpense = useCallback((expense: Expense) => {
    const formData = expenseToFormData(expense);
    formData.description = `Copy of ${expense.description}`;
    formData.date = new Date().toISOString().split('T')[0];
    return formData;
  }, [expenseToFormData]);

  return {
    createExpense,
    updateExpense,
    deleteExpense: deleteExpenseFn,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    clearError: () => setError(null),
    expenseToFormData,
    duplicateExpense
  };
};