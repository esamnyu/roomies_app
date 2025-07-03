import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the entire supabase module before importing anything that uses it
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null })
        }))
      }))
    })),
    rpc: jest.fn()
  }
}));

// Mock the auth middleware
jest.mock('../lib/api/auth/middleware', () => ({
  requireExpenseAccess: jest.fn().mockResolvedValue({ 
    canView: true, 
    canEdit: true, 
    isAdmin: true 
  })
}));

// Now import the functions that use supabase
import { 
  createExpenseWithCustomSplits, 
  updateExpense, 
  getHouseholdBalances,
  createSettlement 
} from '../lib/api/expenses';


const mockHousehold = {
  id: 'household-1',
  name: 'Test Household',
  members: [
    { user_id: 'user-1', display_name: 'Alex' },
    { user_id: 'user-2', display_name: 'Ben' },
    { user_id: 'user-3', display_name: 'Casey' }
  ]
};

// Import the mocked supabase
import { supabase } from '../lib/supabase';

describe('Money Feature - Comprehensive Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Core Functionality Tests', () => {
    describe('Test Case 1: 1-to-1 Equal Split', () => {
      it('should correctly split $100 between Alex and Ben', async () => {
        const mockExpense = {
          id: 'expense-1',
          description: 'Groceries',
          amount: 100,
          paid_by: 'user-1',
          splits: [
            { user_id: 'user-1', amount: 50, is_settled: false },
            { user_id: 'user-2', amount: 50, is_settled: false }
          ]
        };

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockExpense, 
          error: null 
        });

        const result = await createExpenseWithCustomSplits({
          householdId: 'household-1',
          description: 'Groceries',
          amount: 100,
          date: new Date().toISOString(),
          paidBy: 'user-1',
          splits: [
            { userId: 'user-1', amount: 50 },
            { userId: 'user-2', amount: 50 }
          ],
          category: 'GROCERIES'
        });

        expect(result).toBeDefined();
        expect(result.amount).toBe(100);
        expect(result.splits).toHaveLength(2);
        expect(result.splits[0].amount).toBe(50);
        expect(result.splits[1].amount).toBe(50);
      });
    });

    describe('Test Case 2: Group Equal Split (Odd Amount)', () => {
      it('should handle rounding correctly for $100 split among 3 people', async () => {
        const expectedSplits = [
          { user_id: 'user-1', amount: 33.34, is_settled: false },
          { user_id: 'user-2', amount: 33.33, is_settled: false },
          { user_id: 'user-3', amount: 33.33, is_settled: false }
        ];

        const mockExpense = {
          id: 'expense-2',
          description: 'Utility Bill',
          amount: 100,
          paid_by: 'user-1',
          splits: expectedSplits
        };

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockExpense, 
          error: null 
        });

        const result = await createExpenseWithCustomSplits({
          householdId: 'household-1',
          description: 'Utility Bill',
          amount: 100,
          date: new Date().toISOString(),
          paidBy: 'user-1',
          splits: [
            { userId: 'user-1', amount: 33.34 },
            { userId: 'user-2', amount: 33.33 },
            { userId: 'user-3', amount: 33.33 }
          ],
          category: 'UTILITIES'
        });

        expect(result).toBeDefined();
        const totalSplit = result.splits.reduce((sum, split) => sum + split.amount, 0);
        expect(totalSplit).toBeCloseTo(100, 2);
        expect(result.splits[0].amount).toBe(33.34);
      });
    });

    describe('Test Case 3: Group Custom Split', () => {
      it('should correctly handle custom split amounts', async () => {
        const mockExpense = {
          id: 'expense-3',
          description: 'Takeout',
          amount: 100,
          paid_by: 'user-1',
          splits: [
            { user_id: 'user-1', amount: 50, is_settled: false },
            { user_id: 'user-2', amount: 30, is_settled: false },
            { user_id: 'user-3', amount: 20, is_settled: false }
          ]
        };

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockExpense, 
          error: null 
        });

        const result = await createExpenseWithCustomSplits({
          householdId: 'household-1',
          description: 'Takeout',
          amount: 100,
          date: new Date().toISOString(),
          paidBy: 'user-1',
          splits: [
            { userId: 'user-1', amount: 50 },
            { userId: 'user-2', amount: 30 },
            { userId: 'user-3', amount: 20 }
          ],
          category: 'DINING'
        });

        expect(result.splits[0].amount).toBe(50);
        expect(result.splits[1].amount).toBe(30);
        expect(result.splits[2].amount).toBe(20);
      });
    });

    describe('Test Case 4: Edit Unsettled Expense', () => {
      it('should successfully edit an unsettled expense', async () => {
        const originalExpense = {
          id: 'expense-4',
          description: 'Utility Bill',
          amount: 100,
          paid_by: 'user-1',
          splits: [
            { user_id: 'user-1', amount: 33.34, is_settled: false },
            { user_id: 'user-2', amount: 33.33, is_settled: false },
            { user_id: 'user-3', amount: 33.33, is_settled: false }
          ],
          version: 1
        };

        const updatedExpense = {
          ...originalExpense,
          amount: 90,
          splits: [
            { user_id: 'user-1', amount: 30, is_settled: false },
            { user_id: 'user-2', amount: 30, is_settled: false },
            { user_id: 'user-3', amount: 30, is_settled: false }
          ],
          version: 2
        };

        // First call to get current expense
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValueOnce({ 
            data: originalExpense, 
            error: null 
          })
        });

        // Second call to update expense
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: updatedExpense, 
          error: null 
        });

        const result = await updateExpense({
          expenseId: 'expense-4',
          updates: {
            amount: 90,
            splits: [
              { userId: 'user-1', amount: 30 },
              { userId: 'user-2', amount: 30 },
              { userId: 'user-3', amount: 30 }
            ]
          }
        });

        expect(result.amount).toBe(90);
        expect(result.splits).toHaveLength(3);
        expect(result.splits.every(split => split.amount === 30)).toBe(true);
      });
    });

    describe('Test Case 5: Edit Settled Expense', () => {
      it('should create adjustments when editing a settled expense', async () => {
        const settledExpense = {
          id: 'expense-5',
          description: 'Utility Bill',
          amount: 100,
          paid_by: 'user-1',
          splits: [
            { user_id: 'user-1', amount: 33.34, is_settled: true },
            { user_id: 'user-2', amount: 33.33, is_settled: true },
            { user_id: 'user-3', amount: 33.33, is_settled: false }
          ],
          version: 1
        };

        const adjustedExpense = {
          ...settledExpense,
          amount: 90,
          splits: [
            { user_id: 'user-1', amount: 30, is_settled: true },
            { user_id: 'user-2', amount: 30, is_settled: true },
            { user_id: 'user-3', amount: 30, is_settled: false }
          ],
          version: 2,
          adjustments: [
            { user_id: 'user-1', amount: -3.34 },
            { user_id: 'user-2', amount: -3.33 },
            { user_id: 'user-3', amount: -3.33 }
          ]
        };

        // Get current expense
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValueOnce({ 
            data: settledExpense, 
            error: null 
          })
        });

        // Update with adjustments
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: adjustedExpense, 
          error: null 
        });

        const result = await updateExpense({
          expenseId: 'expense-5',
          updates: {
            amount: 90,
            splits: [
              { userId: 'user-1', amount: 30 },
              { userId: 'user-2', amount: 30 },
              { userId: 'user-3', amount: 30 }
            ]
          }
        });

        expect(result.amount).toBe(90);
        expect(result.adjustments).toBeDefined();
        expect(result.adjustments).toHaveLength(3);
      });
    });

    describe('Test Case 6: Multi-Payer Expense', () => {
      it('should handle expenses with multiple payers', async () => {
        const mockExpense = {
          id: 'expense-6',
          description: 'Electric Bill',
          amount: 180,
          paid_by: 'user-1', // Primary payer
          splits: [
            { user_id: 'user-1', amount: 60, is_settled: false },
            { user_id: 'user-2', amount: 60, is_settled: false },
            { user_id: 'user-3', amount: 60, is_settled: false }
          ],
          multi_payers: [
            { user_id: 'user-1', amount: 100 },
            { user_id: 'user-3', amount: 80 }
          ]
        };

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockExpense, 
          error: null 
        });

        const result = await createExpenseWithCustomSplits({
          householdId: 'household-1',
          description: 'Electric Bill',
          amount: 180,
          date: new Date().toISOString(),
          paidBy: 'user-1',
          splits: [
            { userId: 'user-1', amount: 60 },
            { userId: 'user-2', amount: 60 },
            { userId: 'user-3', amount: 60 }
          ],
          multiPayers: [
            { userId: 'user-1', amount: 100 },
            { userId: 'user-3', amount: 80 }
          ],
          category: 'UTILITIES'
        });

        expect(result).toBeDefined();
        expect(result.multi_payers).toBeDefined();
        expect(result.multi_payers).toHaveLength(2);
      });
    });
  });

  describe('Edge Case Tests', () => {
    describe('Balance Calculation Integrity', () => {
      it('should ensure money owed is always owed to a specific person', async () => {
        const mockBalances = [
          { user_id: 'user-1', display_name: 'Alex', balance: 50 },
          { user_id: 'user-2', display_name: 'Ben', balance: -30 },
          { user_id: 'user-3', display_name: 'Casey', balance: -20 }
        ];

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockBalances, 
          error: null 
        });

        const balances = await getHouseholdBalances('household-1');

        // Verify balances sum to zero
        const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
        expect(totalBalance).toBeCloseTo(0, 2);

        // Verify positive balances have corresponding negative balances
        const positiveBalances = balances.filter(b => b.balance > 0);
        const negativeBalances = balances.filter(b => b.balance < 0);
        
        expect(positiveBalances.length).toBeGreaterThan(0);
        expect(negativeBalances.length).toBeGreaterThan(0);
      });
    });

    describe('Concurrent Editing', () => {
      it('should handle version conflicts properly', async () => {
        const expense = {
          id: 'expense-7',
          version: 1,
          amount: 100
        };

        // Simulate concurrent edit error
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValueOnce({ 
            data: { ...expense, version: 2 }, // Version mismatch
            error: null 
          })
        });

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: null, 
          error: { code: 'P0001', message: 'Version mismatch' }
        });

        await expect(updateExpense({
          expenseId: 'expense-7',
          updates: { amount: 90 }
        })).rejects.toThrow();
      });
    });

    describe('Invalid Split Validation', () => {
      it('should reject splits that do not sum to expense amount', async () => {
        await expect(createExpenseWithCustomSplits({
          householdId: 'household-1',
          description: 'Invalid Split',
          amount: 100,
          date: new Date().toISOString(),
          paidBy: 'user-1',
          splits: [
            { userId: 'user-1', amount: 40 },
            { userId: 'user-2', amount: 30 }
            // Missing $30!
          ],
          category: 'OTHER'
        })).rejects.toThrow();
      });

      it('should reject negative split amounts', async () => {
        await expect(createExpenseWithCustomSplits({
          householdId: 'household-1',
          description: 'Negative Split',
          amount: 100,
          date: new Date().toISOString(),
          paidBy: 'user-1',
          splits: [
            { userId: 'user-1', amount: 150 },
            { userId: 'user-2', amount: -50 }
          ],
          category: 'OTHER'
        })).rejects.toThrow();
      });
    });

    describe('Settlement Edge Cases', () => {
      it('should handle zero balance settlements', async () => {
        const mockBalances = [
          { user_id: 'user-1', balance: 0 },
          { user_id: 'user-2', balance: 0 }
        ];

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockBalances, 
          error: null 
        });

        const balances = await getHouseholdBalances('household-1');
        expect(balances.every(b => b.balance === 0)).toBe(true);
      });

      it('should create proper settlement records', async () => {
        const mockSettlement = {
          id: 'settlement-1',
          paid_by: 'user-2',
          paid_to: 'user-1',
          amount: 50,
          created_at: new Date().toISOString()
        };

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockSettlement, 
          error: null 
        });

        const result = await createSettlement({
          householdId: 'household-1',
          paidBy: 'user-2',
          paidTo: 'user-1',
          amount: 50
        });

        expect(result.paid_by).toBe('user-2');
        expect(result.paid_to).toBe('user-1');
        expect(result.amount).toBe(50);
      });
    });

    describe('Precision and Rounding', () => {
      it('should handle very small amounts correctly', async () => {
        const mockExpense = {
          id: 'expense-8',
          amount: 0.01,
          splits: [
            { user_id: 'user-1', amount: 0.01 },
            { user_id: 'user-2', amount: 0 }
          ]
        };

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockExpense, 
          error: null 
        });

        const result = await createExpenseWithCustomSplits({
          householdId: 'household-1',
          description: 'Penny Test',
          amount: 0.01,
          date: new Date().toISOString(),
          paidBy: 'user-1',
          splits: [
            { userId: 'user-1', amount: 0.01 },
            { userId: 'user-2', amount: 0 }
          ],
          category: 'OTHER'
        });

        expect(result.amount).toBe(0.01);
      });

      it('should handle large amounts without precision loss', async () => {
        const largeAmount = 999999.99;
        const mockExpense = {
          id: 'expense-9',
          amount: largeAmount,
          splits: [
            { user_id: 'user-1', amount: largeAmount / 2 },
            { user_id: 'user-2', amount: largeAmount / 2 }
          ]
        };

        (supabase.rpc as jest.Mock).mockResolvedValueOnce({ 
          data: mockExpense, 
          error: null 
        });

        const result = await createExpenseWithCustomSplits({
          householdId: 'household-1',
          description: 'Large Amount Test',
          amount: largeAmount,
          date: new Date().toISOString(),
          paidBy: 'user-1',
          splits: [
            { userId: 'user-1', amount: largeAmount / 2 },
            { userId: 'user-2', amount: largeAmount / 2 }
          ],
          category: 'OTHER'
        });

        expect(result.amount).toBe(largeAmount);
        const totalSplits = result.splits.reduce((sum, s) => sum + s.amount, 0);
        expect(totalSplits).toBeCloseTo(largeAmount, 2);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(createExpenseWithCustomSplits({
        householdId: 'household-1',
        description: 'Network Test',
        amount: 100,
        date: new Date().toISOString(),
        paidBy: 'user-1',
        splits: [{ userId: 'user-1', amount: 100 }],
        category: 'OTHER'
      })).rejects.toThrow('Network error');
    });

    it('should handle database constraint violations', async () => {
      supabase.rpc.mockResolvedValueOnce({ 
        data: null, 
        error: { 
          code: '23503', 
          message: 'Foreign key violation' 
        }
      });

      await expect(createExpenseWithCustomSplits({
        householdId: 'invalid-household',
        description: 'Constraint Test',
        amount: 100,
        date: new Date().toISOString(),
        paidBy: 'user-1',
        splits: [{ userId: 'user-1', amount: 100 }],
        category: 'OTHER'
      })).rejects.toThrow();
    });
  });
});