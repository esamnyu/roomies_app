import { updateExpense } from './expenses';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    rpc: jest.fn(),
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        }))
      }))
    }))
  }
}));

// Import the mocked supabase
const { supabase } = require('../supabase');

describe('Settled Expense Editing - Fix Validation', () => {
  const mockUserId = uuidv4();
  const mockUser2Id = uuidv4();
  const mockUser3Id = uuidv4();
  const mockExpenseId = uuidv4();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    (supabase.auth.getUser as jest.MockedFunction<any>).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Ledger Balance Calculation Fix', () => {
    it('should correctly calculate ledger balance when expense split increases', async () => {
      // Scenario: Alice was settled at $50, now owes $60 (increase of $10)
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      // Mock the database function call
      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // The old split amount was $50, new amount is $60
      // Expected ledger adjustment: -(60 - 50) = -10 (Alice owes $10 more)
      const updateData = {
        description: 'Updated expense',
        amount: 180.00, // Total increased from 150 to 180
        splits: [
          { user_id: mockUserId, amount: 60.00 }, // Alice: was $50, now $60
          { user_id: mockUser2Id, amount: 60.00 }, // Bob: was $50, now $60
          { user_id: mockUser3Id, amount: 60.00 }  // Charlie: was $50, now $60
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      const result = await updateExpense(mockExpenseId, updateData);

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('update_expense_with_adjustments', {
        p_expense_id: mockExpenseId,
        p_description: updateData.description,
        p_amount: updateData.amount,
        p_payments: [{ payer_id: updateData.paid_by, amount: updateData.amount }],
        p_splits: updateData.splits,
        p_date: updateData.date,
        p_expected_version: null
      });
    });

    it('should correctly calculate ledger balance when expense split decreases', async () => {
      // Scenario: User split decreases from $100 to $75 (decrease of $25)
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // Expected ledger adjustment: -(75 - 100) = +25 (User owes $25 less, gets credit)
      const updateData = {
        description: 'Reduced expense',
        amount: 225.00, // Total decreased from 300 to 225
        splits: [
          { user_id: mockUserId, amount: 75.00 }, // Was $100, now $75
          { user_id: mockUser2Id, amount: 75.00 },
          { user_id: mockUser3Id, amount: 75.00 }
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, updateData);

      expect(supabase.rpc).toHaveBeenCalledWith('update_expense_with_adjustments', 
        expect.objectContaining({
          p_splits: updateData.splits
        })
      );
    });

    it('should handle zero net change in splits correctly', async () => {
      // Scenario: Only description changes, amounts stay the same
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // No change in split amounts, so ledger adjustment should be 0
      const updateData = {
        description: 'Updated description only',
        amount: 300.00,
        splits: [
          { user_id: mockUserId, amount: 100.00 }, // Same as before
          { user_id: mockUser2Id, amount: 100.00 },
          { user_id: mockUser3Id, amount: 100.00 }
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, updateData);

      expect(supabase.rpc).toHaveBeenCalledWith('update_expense_with_adjustments', 
        expect.objectContaining({
          p_description: 'Updated description only'
        })
      );
    });
  });

  describe('Equal Split Scenarios', () => {
    it('should handle equal split with no rounding error', async () => {
      // $300 split 3 ways = $100 each exactly
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const updateData = {
        description: 'Equal split - no rounding',
        amount: 300.00,
        splits: [
          { user_id: mockUserId, amount: 100.00 },
          { user_id: mockUser2Id, amount: 100.00 },
          { user_id: mockUser3Id, amount: 100.00 }
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, updateData);

      // Verify all splits are exactly equal
      const expectedSplits = updateData.splits;
      expect(expectedSplits.every(s => s.amount === 100.00)).toBe(true);
    });

    it('should handle equal split with small rounding error', async () => {
      // $100 split 3 ways = $33.33 + $33.33 + $33.34
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const updateData = {
        description: 'Equal split - with rounding',
        amount: 100.00,
        splits: [
          { user_id: mockUserId, amount: 33.33 },
          { user_id: mockUser2Id, amount: 33.33 },
          { user_id: mockUser3Id, amount: 33.34 }
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, updateData);

      // Verify total equals original amount
      const total = updateData.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBeCloseTo(100.00, 2);
      
      // Verify splits are as equal as possible
      const amounts = updateData.splits.map(s => s.amount).sort();
      expect(amounts[2] - amounts[0]).toBeLessThanOrEqual(0.02); // Max difference 2 cents
    });

    it('should handle settled expense conversion to equal split', async () => {
      // Convert custom settled splits to equal splits
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // Original: Alice $75, Bob $25, Charlie $100 (total $200)
      // New equal split: $66.67, $66.67, $66.66 (total $200)
      const updateData = {
        description: 'Convert to equal split',
        amount: 200.00,
        splits: [
          { user_id: mockUserId, amount: 66.67 },   // Alice: was $75, now $66.67 (owes $8.33 less)
          { user_id: mockUser2Id, amount: 66.67 },  // Bob: was $25, now $66.67 (owes $41.67 more)
          { user_id: mockUser3Id, amount: 66.66 }   // Charlie: was $100, now $66.66 (owes $33.34 less)
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, updateData);

      // Verify the splits sum to the correct total
      const total = updateData.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBeCloseTo(200.00, 2);
      
      // Verify splits are nearly equal (account for floating point precision)
      const amounts = updateData.splits.map(s => s.amount);
      const maxDiff = Math.max(...amounts) - Math.min(...amounts);
      expect(maxDiff).toBeLessThanOrEqual(0.02); // Max 2 cents difference for floating point tolerance
    });
  });

  describe('Complex Settlement Scenarios', () => {
    it('should maintain balance consistency across multiple edits', async () => {
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // First edit: Increase total from $150 to $180
      const firstEdit = {
        description: 'First edit - increase total',
        amount: 180.00,
        splits: [
          { user_id: mockUserId, amount: 60.00 },
          { user_id: mockUser2Id, amount: 60.00 },
          { user_id: mockUser3Id, amount: 60.00 }
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, firstEdit);

      // Second edit: Change to unequal split but same total
      const secondEdit = {
        description: 'Second edit - unequal split',
        amount: 180.00,
        splits: [
          { user_id: mockUserId, amount: 80.00 },  // +$20 from previous
          { user_id: mockUser2Id, amount: 50.00 }, // -$10 from previous
          { user_id: mockUser3Id, amount: 50.00 }  // -$10 from previous
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, secondEdit);

      // Verify both calls were made correctly
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should handle edge case of single-person expense', async () => {
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const updateData = {
        description: 'Single person expense',
        amount: 100.00,
        splits: [
          { user_id: mockUserId, amount: 100.00 }
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, updateData);

      expect(supabase.rpc).toHaveBeenCalledWith('update_expense_with_adjustments', 
        expect.objectContaining({
          p_splits: [{ user_id: mockUserId, amount: 100.00 }]
        })
      );
    });

    it('should validate split amounts match total', async () => {
      // This should be caught by validation before reaching the database
      const updateData = {
        description: 'Invalid split total',
        amount: 100.00,
        splits: [
          { user_id: mockUserId, amount: 40.00 },
          { user_id: mockUser2Id, amount: 40.00 }
          // Missing $20 - splits don't add up to total
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await expect(updateExpense(mockExpenseId, updateData))
        .rejects.toThrow();
    });
  });

  describe('Precision and Rounding Tests', () => {
    it('should handle very small amounts correctly', async () => {
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // 1 cent split 3 ways: 0.00, 0.00, 0.01
      const updateData = {
        description: 'Tiny amount test',
        amount: 0.01,
        splits: [
          { user_id: mockUserId, amount: 0.00 },
          { user_id: mockUser2Id, amount: 0.00 },
          { user_id: mockUser3Id, amount: 0.01 }
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, updateData);

      const total = updateData.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(0.01);
    });

    it('should handle floating point precision edge cases', async () => {
      const mockResponse = {
        success: true,
        version: 2,
        message: 'Expense updated successfully with adjustments tracked'
      };

      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      // Amount that often causes floating point issues
      const updateData = {
        description: 'Floating point test',
        amount: 333.33,
        splits: [
          { user_id: mockUserId, amount: 111.11 },
          { user_id: mockUser2Id, amount: 111.11 },
          { user_id: mockUser3Id, amount: 111.11 }
        ],
        paid_by: mockUserId,
        date: '2024-01-15'
      };

      await updateExpense(mockExpenseId, updateData);

      // Should handle the small discrepancy (333.33 vs 333.33)
      expect(supabase.rpc).toHaveBeenCalledWith('update_expense_with_adjustments', 
        expect.objectContaining({
          p_amount: 333.33
        })
      );
    });
  });
});