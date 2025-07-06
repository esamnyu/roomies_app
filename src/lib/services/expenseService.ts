import { z } from 'zod';
import { supabase } from '../supabase';
import type { Expense, RecurringExpense, HouseholdMember } from '../types/types';
import { 
  createExpenseWithCustomSplits,
  createMultiPayerExpense,
  updateExpense as updateExpenseAPI,
  markExpenseSettled,
  getHouseholdExpenses,
  createRecurringExpense as createRecurringExpenseAPI,
  getHouseholdRecurringExpenses,
  toggleRecurringExpense,
  deleteRecurringExpense
} from '../api/expenses';
import { requireExpenseAccess } from '../api/auth/middleware';

// Unified expense service that consolidates all expense operations
export class ExpenseService {
  /**
   * Create a new expense with automatic handling of single/multi-payer scenarios
   */
  static async createExpense(params: {
    householdId: string;
    description: string;
    amount: number;
    splits: Array<{ user_id: string; amount: number }>;
    date?: string;
    category?: string;
    payments?: Array<{ payer_id: string; amount: number }>;
    isRecurring?: boolean;
    recurringConfig?: {
      frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
      dayOfMonth?: number;
    };
    clientUuid?: string;
  }) {
    const { 
      householdId, 
      description, 
      amount, 
      splits, 
      date, 
      category,
      payments,
      isRecurring,
      recurringConfig,
      clientUuid 
    } = params;

    // Handle recurring expense creation
    if (isRecurring && recurringConfig) {
      return await createRecurringExpenseAPI(
        householdId,
        description,
        amount,
        recurringConfig.frequency,
        new Date(date || new Date()),
        recurringConfig.dayOfMonth,
        splits
      );
    }

    // Handle multi-payer expense
    if (payments && payments.length > 1) {
      return await createMultiPayerExpense(
        householdId,
        description,
        payments,
        splits,
        date,
        clientUuid
      );
    }

    // Handle single-payer expense (default)
    const paidById = payments?.[0]?.payer_id;
    return await createExpenseWithCustomSplits(
      householdId,
      description,
      amount,
      splits,
      date,
      paidById,
      clientUuid
    );
  }

  /**
   * Update an existing expense
   */
  static async updateExpense(
    expenseId: string,
    updates: {
      description: string;
      amount: number;
      splits: Array<{ user_id: string; amount: number }>;
      paid_by: string;
      date: string;
      category?: string;
      version?: number;
    }
  ) {
    return await updateExpenseAPI(expenseId, updates);
  }

  /**
   * Delete an expense with proper ledger handling
   * For unsettled expenses: removes the expense and its ledger entries
   * For settled expenses: creates reversal entries to maintain ledger integrity
   */
  static async deleteExpense(expenseId: string): Promise<{ success: boolean; message: string }> {
    const validatedId = z.string().uuid().parse(expenseId);
    
    // The RPC function will handle authorization checks
    const { data, error } = await supabase.rpc('delete_expense_with_ledger', {
      p_expense_id: validatedId
    });
    
    if (error) {
      // Handle specific error cases
      if (error.message.includes('settled')) {
        throw new Error(
          'This expense has settled splits and will be reversed. The ledger will be updated accordingly.'
        );
      }
      if (error.message.includes('not found')) {
        throw new Error('Expense not found');
      }
      if (error.message.includes('permission')) {
        throw new Error('You do not have permission to delete this expense');
      }
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
    
    if (!data?.success) {
      throw new Error(data?.message || 'Failed to delete expense');
    }
    
    return {
      success: true,
      message: data.message || 'Expense deleted successfully'
    };
  }

  /**
   * Get all expenses for a household with optional filtering
   */
  static async getExpenses(params: {
    householdId: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    paidBy?: string;
    includeDeleted?: boolean;
    limit?: number;
  }) {
    const { householdId, startDate, endDate, category, paidBy, includeDeleted = false, limit = 100 } = params;
    
    let query = supabase
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
      .eq('household_id', householdId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (paidBy) {
      query = query.eq('paid_by', paidBy);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }
    
    return data || [];
  }

  /**
   * Get expense statistics for a household
   */
  static async getExpenseStats(householdId: string, period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const expenses = await this.getExpenses({
      householdId,
      startDate: startDate.toISOString().split('T')[0],
      includeDeleted: false
    });

    // Calculate statistics
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expensesByCategory = expenses.reduce((acc, exp) => {
      const cat = exp.category || 'other';
      acc[cat] = (acc[cat] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const expensesByMember = expenses.reduce((acc, exp) => {
      acc[exp.paid_by] = (acc[exp.paid_by] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      period,
      totalAmount,
      expenseCount: expenses.length,
      averageExpense: expenses.length > 0 ? totalAmount / expenses.length : 0,
      byCategory: expensesByCategory,
      byMember: expensesByMember,
      recentExpenses: expenses.slice(0, 5)
    };
  }

  /**
   * Search expenses by description
   */
  static async searchExpenses(householdId: string, searchTerm: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *, 
        profiles:paid_by (id, name, avatar_url), 
        expense_splits (*, profiles:user_id (id, name, avatar_url))
      `)
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .ilike('description', `%${searchTerm}%`)
      .order('date', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to search expenses: ${error.message}`);
    }
    
    return data || [];
  }

  /**
   * Duplicate an expense (useful for recurring similar expenses)
   */
  static async duplicateExpense(expenseId: string, newDate?: string) {
    const { data: originalExpense, error } = await supabase
      .from('expenses')
      .select(`
        *, 
        expense_splits (*)
      `)
      .eq('id', expenseId)
      .single();

    if (error || !originalExpense) {
      throw new Error('Failed to fetch original expense');
    }

    const splits = originalExpense.expense_splits.map((split: any) => ({
      user_id: split.user_id,
      amount: split.amount
    }));

    return await this.createExpense({
      householdId: originalExpense.household_id,
      description: `Copy of ${originalExpense.description}`,
      amount: originalExpense.amount,
      splits,
      date: newDate || new Date().toISOString().split('T')[0],
      category: originalExpense.category,
      payments: [{ payer_id: originalExpense.paid_by, amount: originalExpense.amount }]
    });
  }

  /**
   * Batch create expenses from a list
   */
  static async batchCreateExpenses(expenses: Array<{
    householdId: string;
    description: string;
    amount: number;
    splits: Array<{ user_id: string; amount: number }>;
    date?: string;
    paidBy?: string;
  }>) {
    const results = await Promise.allSettled(
      expenses.map(expense => 
        this.createExpense({
          householdId: expense.householdId,
          description: expense.description,
          amount: expense.amount,
          splits: expense.splits,
          date: expense.date,
          payments: expense.paidBy ? [{ payer_id: expense.paidBy, amount: expense.amount }] : undefined
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      successful,
      failed,
      results: results.map((r, i) => ({
        index: i,
        success: r.status === 'fulfilled',
        error: r.status === 'rejected' ? r.reason.message : null
      }))
    };
  }

  /**
   * Export expenses to CSV format
   */
  static async exportExpenses(householdId: string, format: 'csv' | 'json' = 'csv') {
    const expenses = await this.getExpenses({ householdId, includeDeleted: false, limit: 1000 });
    
    if (format === 'json') {
      return JSON.stringify(expenses, null, 2);
    }

    // CSV format
    const headers = ['Date', 'Description', 'Amount', 'Paid By', 'Category', 'Split Details'];
    const rows = expenses.map(exp => {
      const splitDetails = exp.expense_splits
        ?.map((s: any) => `${s.profiles?.name}: $${s.amount.toFixed(2)}`)
        .join('; ');
      
      return [
        exp.date,
        exp.description,
        exp.amount.toFixed(2),
        exp.profiles?.name || 'Unknown',
        exp.category || 'Other',
        splitDetails || 'No splits'
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }
}

// Export individual functions for backward compatibility
export const {
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
  getExpenseStats,
  searchExpenses,
  duplicateExpense,
  batchCreateExpenses,
  exportExpenses
} = ExpenseService;