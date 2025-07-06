import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase client
const supabase = createClient('http://localhost:54321', 'test-key');

describe('Expense API Tests', () => {
  const householdId = uuidv4();
  const user1Id = uuidv4();
  const user2Id = uuidv4();
  const user3Id = uuidv4();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createExpenseAtomic', () => {
    it('should create expense with single payer and equal splits', async () => {
      const clientUuid = uuidv4();
      const expenseData = {
        household_id: householdId,
        description: 'Groceries',
        amount: 150.00,
        payments: [{ payer_id: user1Id, amount: 150.00 }],
        splits: [
          { user_id: user1Id, amount: 50.00 },
          { user_id: user2Id, amount: 50.00 },
          { user_id: user3Id, amount: 50.00 }
        ],
        date: new Date().toISOString(),
        client_uuid: clientUuid
      };

      const { data, error } = await supabase.rpc('create_expense_atomic', expenseData);

      expect(error).toBeNull();
      expect(data).toMatchObject({
        success: true,
        idempotent: false,
        expense_id: expect.any(String)
      });
    });

    it('should handle idempotent requests', async () => {
      const clientUuid = uuidv4();
      const expenseData = {
        household_id: householdId,
        description: 'Rent',
        amount: 1000.00,
        payments: [{ payer_id: user1Id, amount: 1000.00 }],
        splits: [
          { user_id: user1Id, amount: 500.00 },
          { user_id: user2Id, amount: 500.00 }
        ],
        client_uuid: clientUuid
      };

      // First request
      const { data: data1 } = await supabase.rpc('create_expense_atomic', expenseData);
      
      // Duplicate request
      const { data: data2 } = await supabase.rpc('create_expense_atomic', expenseData);

      expect(data1.idempotent).toBe(false);
      expect(data2.idempotent).toBe(true);
      expect(data1.expense_id).toBe(data2.expense_id);
    });

    it('should handle multi-payer expenses', async () => {
      const expenseData = {
        household_id: householdId,
        description: 'Shared Uber',
        amount: 30.00,
        payments: [
          { payer_id: user1Id, amount: 20.00 },
          { payer_id: user2Id, amount: 10.00 }
        ],
        splits: [
          { user_id: user1Id, amount: 10.00 },
          { user_id: user2Id, amount: 10.00 },
          { user_id: user3Id, amount: 10.00 }
        ]
      };

      const { data, error } = await supabase.rpc('create_expense_atomic', expenseData);

      expect(error).toBeNull();
      expect(data.success).toBe(true);
    });

    it('should reject invalid payment sum', async () => {
      const expenseData = {
        household_id: householdId,
        description: 'Invalid expense',
        amount: 100.00,
        payments: [{ payer_id: user1Id, amount: 90.00 }], // Wrong sum
        splits: [
          { user_id: user1Id, amount: 50.00 },
          { user_id: user2Id, amount: 50.00 }
        ]
      };

      const { error } = await supabase.rpc('create_expense_atomic', expenseData);

      expect(error).toBeDefined();
      expect(error.message).toContain('Payment amounts');
    });
  });

  describe('updateExpenseWithAdjustments', () => {
    it('should update expense and track adjustments for settled splits', async () => {
      // First create an expense
      const createData = {
        household_id: householdId,
        description: 'Original expense',
        amount: 100.00,
        payments: [{ payer_id: user1Id, amount: 100.00 }],
        splits: [
          { user_id: user1Id, amount: 50.00 },
          { user_id: user2Id, amount: 50.00 }
        ]
      };

      const { data: created } = await supabase.rpc('create_expense_atomic', createData);

      // Mark splits as settled
      await supabase
        .from('expense_splits')
        .update({ settled: true })
        .eq('expense_id', created.expense_id);

      // Update the expense
      const updateData = {
        expense_id: created.expense_id,
        description: 'Updated expense',
        amount: 120.00,
        payments: [{ payer_id: user1Id, amount: 120.00 }],
        splits: [
          { user_id: user1Id, amount: 60.00 },
          { user_id: user2Id, amount: 60.00 }
        ],
        date: new Date().toISOString(),
        expected_version: 1
      };

      const { data: updated, error } = await supabase.rpc('update_expense_with_adjustments', updateData);

      expect(error).toBeNull();
      expect(updated.success).toBe(true);

      // Check adjustments were created
      const { data: adjustments } = await supabase
        .from('expense_split_adjustments')
        .select('*')
        .eq('expense_split_id', created.expense_id);

      expect(adjustments).toHaveLength(2); // One for each user
      expect(adjustments[0].adjustment_amount).toBe(10.00);
    });

    it('should handle optimistic concurrency control', async () => {
      const createData = {
        household_id: householdId,
        description: 'Concurrent expense',
        amount: 100.00,
        payments: [{ payer_id: user1Id, amount: 100.00 }],
        splits: [
          { user_id: user1Id, amount: 50.00 },
          { user_id: user2Id, amount: 50.00 }
        ]
      };

      const { data: created } = await supabase.rpc('create_expense_atomic', createData);

      // Simulate concurrent update by using wrong version
      const updateData = {
        expense_id: created.expense_id,
        description: 'Concurrent update',
        amount: 120.00,
        payments: [{ payer_id: user1Id, amount: 120.00 }],
        splits: [
          { user_id: user1Id, amount: 60.00 },
          { user_id: user2Id, amount: 60.00 }
        ],
        date: new Date().toISOString(),
        expected_version: 99 // Wrong version
      };

      const { error } = await supabase.rpc('update_expense_with_adjustments', updateData);

      expect(error).toBeDefined();
      expect(error.message).toContain('modified by another user');
    });
  });

  describe('processRecurringExpenses', () => {
    it('should process due recurring expenses with custom splits', async () => {
      // Create a recurring expense due today
      const { data: recurring } = await supabase
        .from('recurring_expenses')
        .insert({
          household_id: householdId,
          description: 'Monthly Rent',
          amount: 1500.00,
          frequency: 'monthly',
          next_due_date: new Date().toISOString().split('T')[0],
          is_active: true,
          created_by: user1Id,
          splits: [
            { user_id: user1Id, amount: 500.00 },
            { user_id: user2Id, amount: 500.00 },
            { user_id: user3Id, amount: 500.00 }
          ]
        })
        .select()
        .single();

      // Process recurring expenses
      const { data, error } = await supabase.rpc('process_recurring_expenses_robust', {
        p_household_id: householdId
      });

      expect(error).toBeNull();
      expect(data.processed).toBe(1);
      expect(data.errors).toBe(0);

      // Check expense was created
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('recurring_expense_id', recurring.id);

      expect(expenses).toHaveLength(1);
      expect(expenses[0].description).toContain('(Recurring)');
    });

    it('should handle concurrent processing with row locking', async () => {
      // Create multiple recurring expenses
      const recurringData = Array.from({ length: 5 }, (_, i) => ({
        household_id: householdId,
        description: `Subscription ${i}`,
        amount: 10.00,
        frequency: 'monthly',
        next_due_date: new Date().toISOString().split('T')[0],
        is_active: true,
        created_by: user1Id
      }));

      await supabase.from('recurring_expenses').insert(recurringData);

      // Simulate concurrent processing
      const promises = Array.from({ length: 3 }, () =>
        supabase.rpc('process_recurring_expenses_robust', {
          p_household_id: householdId,
          p_batch_size: 2
        })
      );

      const results = await Promise.all(promises);
      
      const totalProcessed = results.reduce((sum, r) => sum + r.data.processed, 0);
      expect(totalProcessed).toBe(5); // All should be processed exactly once
    });
  });

  describe('Ledger Balance Queries', () => {
    it('should return correct balances after multiple transactions', async () => {
      // Create several expenses
      const expenses = [
        {
          description: 'Expense 1',
          amount: 100.00,
          payments: [{ payer_id: user1Id, amount: 100.00 }],
          splits: [
            { user_id: user1Id, amount: 50.00 },
            { user_id: user2Id, amount: 50.00 }
          ]
        },
        {
          description: 'Expense 2',
          amount: 60.00,
          payments: [{ payer_id: user2Id, amount: 60.00 }],
          splits: [
            { user_id: user1Id, amount: 30.00 },
            { user_id: user2Id, amount: 30.00 }
          ]
        }
      ];

      for (const expense of expenses) {
        await supabase.rpc('create_expense_atomic', {
          household_id: householdId,
          ...expense
        });
      }

      // Query balances
      const { data: balances } = await supabase.rpc('get_household_balances_fast', {
        p_household_id: householdId
      });

      // User1: paid 100, owes 80, balance = +20
      // User2: paid 60, owes 80, balance = -20
      const user1Balance = balances.find(b => b.user_id === user1Id);
      const user2Balance = balances.find(b => b.user_id === user2Id);

      expect(user1Balance.balance).toBe(20.00);
      expect(user2Balance.balance).toBe(-20.00);
    });

    it('should update balances correctly after settlement', async () => {
      // Create settlement
      await supabase.from('settlements').insert({
        household_id: householdId,
        payer_id: user2Id,
        payee_id: user1Id,
        amount: 20.00,
        description: 'Settling up'
      });

      // Query balances again
      const { data: balances } = await supabase.rpc('get_household_balances_fast', {
        p_household_id: householdId
      });

      // After settlement, both should have 0 balance
      expect(balances.every(b => b.balance === 0)).toBe(true);
    });
  });
});