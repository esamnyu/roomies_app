// src/lib/api/__tests__/settlements.test.ts
import { calculateBalances, getSettlementSuggestions } from '../settlements';
import { createExpenseWithCustomSplits } from '../expenses';
import { createSettlement } from '../settlements';
import { supabase } from '../../supabase';
import type { Expense, HouseholdMember, Settlement, Profile } from '../../types/types';

// Mock Supabase to prevent actual API calls during tests
jest.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => ({ data: { user: { id: 'user-2' } } })), // Mock current user for createExpenseWithCustomSplits & createSettlement
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    rpc: jest.fn(),
  },
}));

// Mock API functions for isolated testing where needed
jest.mock('../expenses', () => ({
  createExpenseWithCustomSplits: jest.fn(async (householdId, description, amount, splits) => {
    // Implement basic validation for the test 'should reject expense with mismatched splits total'
    interface Split {
      user_id: string;
      amount: number;
    }
    const totalSplitsAmount: number = splits.reduce((sum: number, split: Split) => sum + split.amount, 0);
    if (Math.abs(totalSplitsAmount - amount) > 0.01) { // Allow for minor floating point differences
      throw new Error('Split amounts must approximately equal total expense amount');
    }
    // Mock the RPC call for successful creation
    const { supabase } = jest.requireActual('../../supabase'); // Use actual supabase mock
    const { data, error } = await supabase.rpc('create_expense_with_splits', {
      p_household_id: householdId,
      p_description: description,
      p_amount: amount,
      p_paid_by: 'user-2', // Hardcode for mock or get from getUser mock if needed
      p_splits: splits,
      p_date: new Date().toISOString().split('T')[0],
    });
    if (error) throw error;
    return { id: data || 'mock-expense-id', household_id: householdId, description, amount, paid_by: 'user-2', date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), expense_splits: [] };
  }),
}));

jest.mock('../settlements', () => ({
  ...jest.requireActual('../settlements'), // Import and retain default behavior for calculateBalances etc.
  createSettlement: jest.fn(async (settlement) => {
    const { supabase } = jest.requireActual('../../supabase'); // Use actual supabase mock
    const { data, error } = await supabase.rpc('create_settlement_and_notify', {
      p_household_id: settlement.household_id,
      p_payer_id: settlement.payer_id,
      p_payee_id: settlement.payee_id,
      p_amount: settlement.amount,
      p_description: settlement.description,
    }).select(`
      *,
      payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
      payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
    `).single();

    if (error) {
      console.error("Mock Error creating settlement:", error);
      throw error;
    }
    return data;
  }),
}));


describe('Settlements and Expenses Integration', () => {
  const mockHouseholdId = 'household-123';
  const mockUserId1 = 'user-1'; // Alice
  const mockUserId2 = 'user-2'; // Bob (current user in createSettlement mock)
  const mockUserId3 = 'user-3'; // Charlie

  const mockProfiles: Record<string, Profile> = {
    [mockUserId1]: { id: mockUserId1, name: 'Alice', created_at: '', updated_at: '' , avatar_url: null},
    [mockUserId2]: { id: mockUserId2, name: 'Bob', created_at: '', updated_at: '' , avatar_url: null},
    [mockUserId3]: { id: mockUserId3, name: 'Charlie', created_at: '', updated_at: '' , avatar_url: null},
  };

  const mockMembers: HouseholdMember[] = [
    { id: 'member-1', household_id: mockHouseholdId, user_id: mockUserId1, role: 'member', joined_at: '2024-01-01', profiles: mockProfiles[mockUserId1] },
    { id: 'member-2', household_id: mockHouseholdId, user_id: mockUserId2, role: 'member', joined_at: '2024-01-01', profiles: mockProfiles[mockUserId2] },
    { id: 'member-3', household_id: mockHouseholdId, user_id: mockUserId3, role: 'member', joined_at: '2024-01-01', profiles: mockProfiles[mockUserId3] },
  ];

  // Mock profile fetching for calculateBalances console.warn
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test

    // Mock supabase.from for 'profiles' table specifically for calculateBalances
    (supabase.from as jest.Mock).mockImplementation((tableName: string) => {
      if (tableName === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((column, value) => {
            if (column === 'id') {
              const profile = mockMembers.find(m => m.user_id === value)?.profiles;
              return {
                single: jest.fn(() => Promise.resolve({ data: profile, error: null })),
              };
            }
            return { single: jest.fn(() => Promise.resolve({ data: null, error: new Error('Not found') })) };
          }),
        };
      }
      // Fallback for other tables if needed, or return a mock that throws to catch unexpected calls
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: new Error('Mock not implemented for this table') })),
      };
    });
  });

  afterEach(() => {
    // jest.clearAllMocks(); // Cleared in beforeEach now
  });

  describe('calculateBalances', () => {
    it('should calculate correct balances with no expenses or settlements', () => {
      const expenses: Expense[] = [];
      const settlements: Settlement[] = [];
      const balances = calculateBalances(expenses, mockMembers, settlements);

      expect(balances.length).toBe(3);
      expect(balances.find(b => b.userId === mockUserId1)?.balance).toBe(0);
      expect(balances.find(b => b.userId === mockUserId2)?.balance).toBe(0);
      expect(balances.find(b => b.userId === mockUserId3)?.balance).toBe(0);
    });

    it('should calculate correct balances when one person pays for everyone', () => {
      const expenses: Expense[] = [
        {
          id: 'expense-1',
          household_id: mockHouseholdId,
          description: 'Groceries',
          amount: 90,
          paid_by: mockUserId1, // Alice paid
          date: '2024-01-01',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          expense_splits: [
            { id: 'split-1', expense_id: 'expense-1', user_id: mockUserId1, amount: 30, settled: false },
            { id: 'split-2', expense_id: 'expense-1', user_id: mockUserId2, amount: 30, settled: false },
            { id: 'split-3', expense_id: 'expense-1', user_id: mockUserId3, amount: 30, settled: false },
          ],
        },
      ];
      const settlements: Settlement[] = [];
      const balances = calculateBalances(expenses, mockMembers, settlements);

      const aliceBalance = balances.find(b => b.userId === mockUserId1);
      const bobBalance = balances.find(b => b.userId === mockUserId2);
      const charlieBalance = balances.find(b => b.userId === mockUserId3);

      // Alice paid 90, owes 30 = 60
      expect(aliceBalance?.balance).toBe(60);
      // Bob paid 0, owes 30 = -30
      expect(bobBalance?.balance).toBe(-30);
      // Charlie paid 0, owes 30 = -30
      expect(charlieBalance?.balance).toBe(-30);
    });

    it('should handle settlements correctly', () => {
      const expenses: Expense[] = [
        {
          id: 'expense-1',
          household_id: mockHouseholdId,
          description: 'Dinner',
          amount: 90,
          paid_by: mockUserId1, // Alice paid
          date: '2024-01-05',
          created_at: '2024-01-05T10:00:00Z',
          updated_at: '2024-01-05T10:00:00Z',
          expense_splits: [
            { id: 'split-1', expense_id: 'expense-1', user_id: mockUserId1, amount: 30, settled: false },
            { id: 'split-2', expense_id: 'expense-1', user_id: mockUserId2, amount: 30, settled: false },
            { id: 'split-3', expense_id: 'expense-1', user_id: mockUserId3, amount: 30, settled: false },
          ],
        },
      ];

      const settlements: Settlement[] = [
        {
          id: 'settlement-1',
          household_id: mockHouseholdId,
          payer_id: mockUserId2, // Bob pays
          payee_id: mockUserId1, // Alice receives
          amount: 30,
          description: 'Bob pays Alice for dinner',
          created_at: '2024-01-06T10:00:00Z',
        },
      ];

      const balances = calculateBalances(expenses, mockMembers, settlements);

      const aliceBalance = balances.find(b => b.userId === mockUserId1);
      const bobBalance = balances.find(b => b.userId === mockUserId2);
      const charlieBalance = balances.find(b => b.userId === mockUserId3);

      // Alice: Paid 90, owes 30 = +60. Received 30 from Bob (reduces amount owed to her) = +30
      expect(aliceBalance?.balance).toBe(30);
      // Bob: Paid 0, owes 30 = -30. Paid 30 to Alice (reduces his debt) = 0
      expect(bobBalance?.balance).toBe(0);
      // Charlie: Paid 0, owes 30 = -30 (no settlement with Charlie)
      expect(charlieBalance?.balance).toBe(-30);
    });

    it('should handle multiple expenses and settlements', () => {
      const expenses: Expense[] = [
        {
          id: 'expense-1',
          household_id: mockHouseholdId,
          description: 'Rent',
          amount: 1500,
          paid_by: mockUserId1, // Alice paid
          date: '2024-01-01',
          created_at: '2024-01-01T08:00:00Z',
          updated_at: '2024-01-01T08:00:00Z',
          expense_splits: [
            { id: 'split-1', expense_id: 'expense-1', user_id: mockUserId1, amount: 500, settled: false },
            { id: 'split-2', expense_id: 'expense-1', user_id: mockUserId2, amount: 500, settled: false },
            { id: 'split-3', expense_id: 'expense-1', user_id: mockUserId3, amount: 500, settled: false },
          ],
        },
        {
          id: 'expense-2',
          household_id: mockHouseholdId,
          description: 'Utilities',
          amount: 150,
          paid_by: mockUserId2, // Bob paid
          date: '2024-01-03',
          created_at: '2024-01-03T09:00:00Z',
          updated_at: '2024-01-03T09:00:00Z',
          expense_splits: [
            { id: 'split-4', expense_id: 'expense-2', user_id: mockUserId1, amount: 50, settled: false },
            { id: 'split-5', expense_id: 'expense-2', user_id: mockUserId2, amount: 50, settled: false },
            { id: 'split-6', expense_id: 'expense-2', user_id: mockUserId3, amount: 50, settled: false },
          ],
        },
      ];

      const settlements: Settlement[] = [
        {
          id: 'settlement-1',
          household_id: mockHouseholdId,
          payer_id: mockUserId3, // Charlie pays
          payee_id: mockUserId1, // Alice receives
          amount: 200,
          description: 'Partial rent payment',
          created_at: '2024-01-10',
        },
      ];

      const balances = calculateBalances(expenses, mockMembers, settlements);

      const aliceBalance = balances.find(b => b.userId === mockUserId1);
      const bobBalance = balances.find(b => b.userId === mockUserId2);
      const charlieBalance = balances.find(b => b.userId === mockUserId3);

      // Alice: Paid 1500 (rent) - 500 (her rent share) - 50 (her utilities share) = 950.
      // Then received 200 from Charlie (reduces amount owed to her) = 750.
      expect(aliceBalance?.balance).toBe(750);
      // Bob: Paid 150 (utilities) - 500 (his rent share) - 50 (his utilities share) = -400.
      expect(bobBalance?.balance).toBe(-400);
      // Charlie: Paid 0 - 500 (his rent share) - 50 (his utilities share) = -550.
      // Then paid 200 to Alice (reduces his debt) = -350.
      expect(charlieBalance?.balance).toBe(-350);
    });

    it('should handle settled expense splits', () => {
      const expenses: Expense[] = [
        {
          id: 'expense-1',
          household_id: mockHouseholdId,
          description: 'Pizza',
          amount: 30,
          paid_by: mockUserId1, // Alice paid
          date: '2024-01-15',
          created_at: '2024-01-15T12:00:00Z',
          updated_at: '2024-01-15T12:00:00Z',
          expense_splits: [
            { id: 'split-1', expense_id: 'expense-1', user_id: mockUserId1, amount: 10, settled: false },
            { id: 'split-2', expense_id: 'expense-1', user_id: mockUserId2, amount: 10, settled: true }, // Bob's split settled
            { id: 'split-3', expense_id: 'expense-1', user_id: mockUserId3, amount: 10, settled: false },
          ],
        },
      ];
      const settlements: Settlement[] = [];
      const balances = calculateBalances(expenses, mockMembers, settlements);

      const aliceBalance = balances.find(b => b.userId === mockUserId1);
      const bobBalance = balances.find(b => b.userId === mockUserId2);
      const charlieBalance = balances.find(b => b.userId === mockUserId3);

      // Alice: Paid 30, owes 10 = +20
      expect(aliceBalance?.balance).toBe(20);
      // Bob: Paid 0, owes 10, but his split is settled = 0
      expect(bobBalance?.balance).toBe(0);
      // Charlie: Paid 0, owes 10 = -10
      expect(charlieBalance?.balance).toBe(-10);
    });
  });

  describe('getSettlementSuggestions', () => {
    it('should suggest optimal settlements', () => {
      const balances = [
        { userId: mockUserId1, balance: 50, profile: mockMembers[0].profiles! }, // Alice owed 50
        { userId: mockUserId2, balance: -30, profile: mockMembers[1].profiles! }, // Bob owes 30
        { userId: mockUserId3, balance: -20, profile: mockMembers[2].profiles! }, // Charlie owes 20
      ];

      const suggestions = getSettlementSuggestions(balances);

      expect(suggestions.length).toBe(2);

      // Bob pays Alice 30
      expect(suggestions).toContainEqual({
        from: mockUserId2,
        to: mockUserId1,
        amount: 30,
        fromProfile: mockMembers[1].profiles!,
        toProfile: mockMembers[0].profiles!,
      });

      // Charlie pays Alice 20
      expect(suggestions).toContainEqual({
        from: mockUserId3,
        to: mockUserId1,
        amount: 20,
        fromProfile: mockMembers[2].profiles!,
        toProfile: mockMembers[0].profiles!,
      });
    });

    it('should handle complex settlement scenarios', () => {
      const balances = [
        { userId: mockUserId1, balance: 100, profile: mockMembers[0].profiles! }, // Alice owed 100
        { userId: mockUserId2, balance: -60, profile: mockMembers[1].profiles! }, // Bob owes 60
        { userId: mockUserId3, balance: -40, profile: mockMembers[2].profiles! }, // Charlie owes 40
      ];

      const suggestions = getSettlementSuggestions(balances);

      expect(suggestions.length).toBe(2);
      expect(suggestions).toContainEqual({
        from: mockUserId2,
        to: mockUserId1,
        amount: 60,
        fromProfile: mockMembers[1].profiles!,
        toProfile: mockMembers[0].profiles!,
      });
      expect(suggestions).toContainEqual({
        from: mockUserId3,
        to: mockUserId1,
        amount: 40,
        fromProfile: mockMembers[2].profiles!,
        toProfile: mockMembers[0].profiles!,
      });
    });

    it('should handle zero balances', () => {
      const balances = [
        { userId: mockUserId1, balance: 0, profile: mockMembers[0].profiles! },
        { userId: mockUserId2, balance: 0, profile: mockMembers[1].profiles! },
      ];
      const suggestions = getSettlementSuggestions(balances);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('API Integration Tests', () => {
    it('should create expense with splits correctly', async () => {
      // Mock the RPC response for create_expense_with_splits
      (supabase.rpc as jest.Mock).mockImplementationOnce((functionName, params) => {
        if (functionName === 'create_expense_with_splits') {
          // Simulate a successful ID return
          return Promise.resolve({ data: 'mock-expense-id', error: null });
        }
        return Promise.resolve({ data: null, error: new Error('Unknown RPC call') });
      });

      const description = 'Mock Expense';
      const amount = 100;
      const splits = [
        { user_id: mockUserId1, amount: 50 },
        { user_id: mockUserId2, amount: 50 },
      ];

      // Call the actual createExpenseWithCustomSplits from the mock to trigger RPC call
      const { createExpenseWithCustomSplits: actualCreateExpenseWithCustomSplits } = jest.requireActual('../expenses');
      await actualCreateExpenseWithCustomSplits(mockHouseholdId, description, amount, splits);


      expect(supabase.rpc).toHaveBeenCalledWith('create_expense_with_splits', {
        p_household_id: mockHouseholdId,
        p_description: description,
        p_amount: amount,
        p_paid_by: 'user-2', // Mocked user ID
        p_splits: splits,
        p_date: expect.any(String),
      });
    });

    it('should create settlement correctly', async () => {
      const mockSettlement = {
        id: 'new-settlement-id',
        household_id: mockHouseholdId,
        payer_id: mockUserId2,
        payee_id: mockUserId1,
        amount: 50,
        description: 'Paying back',
        created_at: '2024-01-01T00:00:00Z',
        payer_profile: mockProfiles[mockUserId2], // Use mockProfiles for consistency
        payee_profile: mockProfiles[mockUserId1], // Use mockProfiles for consistency
      };

      // Mock the RPC response for create_settlement_and_notify
      (supabase.rpc as jest.Mock).mockImplementationOnce((functionName, params) => {
        if (functionName === 'create_settlement_and_notify') {
          return {
            select: jest.fn().mockReturnThis(),
            single: jest.fn(() => Promise.resolve({ data: mockSettlement, error: null })),
          };
        }
        return Promise.resolve({ data: null, error: new Error('Unknown RPC call') });
      });


      const settlementToCreate = {
        household_id: mockHouseholdId,
        payer_id: mockUserId2, // Bob is the payer (current user)
        payee_id: mockUserId1, // Alice is the payee
        amount: 50,
        description: 'Paying back',
      };

      // Call the actual createSettlement from the mock
      const { createSettlement: actualCreateSettlement } = jest.requireActual('../settlements');
      const result = await actualCreateSettlement(settlementToCreate);

      expect(result).toEqual(mockSettlement);
      expect(supabase.rpc).toHaveBeenCalledWith('create_settlement_and_notify', {
        p_household_id: mockHouseholdId,
        p_payer_id: mockUserId2, // Ensure payer_id is passed
        p_payee_id: mockUserId1,
        p_amount: 50,
        p_description: 'Paying back',
      });
    });

    it('should reject expense with mismatched splits total', async () => {
      // Mocking the rpc call inside createExpenseWithCustomSplits
      (supabase.rpc as jest.Mock).mockImplementation((functionName, params) => {
        if (functionName === 'create_expense_with_splits') {
          const totalSplitsAmount = params.p_splits.reduce((sum: number, split: { amount: number }) => sum + split.amount, 0);
          if (Math.abs(totalSplitsAmount - params.p_amount) > 0.01) {
            return Promise.resolve({ data: null, error: { message: 'Split amounts must approximately equal total expense amount' } });
          }
          return Promise.resolve({ data: 'mock-expense-id', error: null });
        }
        return Promise.resolve({ data: null, error: new Error('Unknown RPC call') });
      });
      
      const description = 'Mock Expense';
      const amount = 100;
      const splits = [
        { user_id: mockUserId1, amount: 40 },
        { user_id: mockUserId2, amount: 40 },
      ]; // Total 80, not 100

      // Call the actual createExpenseWithCustomSplits from the mock
      const { createExpenseWithCustomSplits: actualCreateExpenseWithCustomSplits } = jest.requireActual('../expenses');
      await expect(actualCreateExpenseWithCustomSplits(mockHouseholdId, description, amount, splits)).rejects.toThrow('Split amounts must approximately equal total expense amount');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rounding errors in splits', () => {
      const expenses: Expense[] = [
        {
          id: 'expense-1',
          household_id: mockHouseholdId,
          description: 'Internet Bill',
          amount: 100,
          paid_by: mockUserId1,
          date: '2024-01-01',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          expense_splits: [
            { id: 'split-1', expense_id: 'expense-1', user_id: mockUserId1, amount: 33.33, settled: false },
            { id: 'split-2', expense_id: 'expense-1', user_id: mockUserId2, amount: 33.33, settled: false },
            { id: 'split-3', expense_id: 'expense-1', user_id: mockUserId3, amount: 33.34, settled: false }, // Adjusted for rounding
          ], // Total 100
        },
      ];
      const settlements: Settlement[] = [];
      const balances = calculateBalances(expenses, mockMembers, settlements);

      const aliceBalance = balances.find(b => b.userId === mockUserId1);
      const bobBalance = balances.find(b => b.userId === mockUserId2);
      const charlieBalance = balances.find(b => b.userId === mockUserId3);

      // Alice: Paid 100, owes 33.33 = 66.67
      expect(aliceBalance?.balance).toBeCloseTo(66.67);
      // Bob: Paid 0, owes 33.33 = -33.33
      expect(bobBalance?.balance).toBeCloseTo(-33.33);
      // Charlie: Paid 0, owes 33.34 = -33.34
      expect(charlieBalance?.balance).toBeCloseTo(-33.34);
    });

    it('should handle members with no profile gracefully', () => {
      const membersWithoutProfile: HouseholdMember[] = [
        ...mockMembers.slice(0, 2),
        {
          id: 'member-3',
          household_id: mockHouseholdId,
          user_id: mockUserId3,
          role: 'member',
          joined_at: '2024-01-01',
          // No profile here to test graceful handling
        },
      ];

      const expenses: Expense[] = [
        {
          id: 'expense-1', household_id: mockHouseholdId, description: 'Test', amount: 30, paid_by: mockUserId1, date: '2024-01-01', created_at: '2024-01-01T10:00:00Z', updated_at: '2024-01-01T10:00:00Z',
          expense_splits: [
            { id: 'split-1', expense_id: 'expense-1', user_id: mockUserId1, amount: 10, settled: false },
            { id: 'split-2', expense_id: 'expense-1', user_id: mockUserId2, amount: 10, settled: false },
            { id: 'split-3', expense_id: 'expense-1', user_id: mockUserId3, amount: 10, settled: false },
          ],
        },
      ];
      const settlements: Settlement[] = [];

      // Expect a warning to be logged because user-3 has no profile
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const balances = calculateBalances(expenses, membersWithoutProfile, settlements);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Profile not found for user ID: ${mockUserId3} in calculateBalances.`);
      
      // Ensure balances are calculated for users with profiles
      expect(balances.length).toBe(2); 
      expect(balances.find(b => b.userId === mockUserId1)?.balance).toBe(20); // Paid 30, owes 10 = 20
      expect(balances.find(b => b.userId === mockUserId2)?.balance).toBe(-10); // Owes 10
      expect(balances.find(b => b.userId === mockUserId3)).toBeUndefined(); // User 3 should not have a balance entry
      
      consoleWarnSpy.mockRestore(); // Restore original console.warn
    });

    it('should handle very large amounts', () => {
      const expenses: Expense[] = [
        {
          id: 'expense-1',
          household_id: mockHouseholdId,
          description: 'Mansion',
          amount: 100000000, // 100 million
          paid_by: mockUserId1,
          date: '2024-01-01',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          expense_splits: [
            { id: 'split-1', expense_id: 'expense-1', user_id: mockUserId1, amount: 50000000, settled: false },
            { id: 'split-2', expense_id: 'expense-1', user_id: mockUserId2, amount: 50000000, settled: false },
          ],
        },
      ];
      const settlements: Settlement[] = [];
      const balances = calculateBalances(expenses, mockMembers, settlements);

      const aliceBalance = balances.find(b => b.userId === mockUserId1);
      const bobBalance = balances.find(b => b.userId === mockUserId2);

      expect(aliceBalance?.balance).toBe(50000000);
      expect(bobBalance?.balance).toBe(-50000000);
    });

    it('should handle zero amount expenses', () => {
      const expenses: Expense[] = [
        {
          id: 'expense-1',
          household_id: mockHouseholdId,
          description: 'Free Sample',
          amount: 0,
          paid_by: mockUserId1,
          date: '2024-01-01',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          expense_splits: [], // No splits for zero amount expense
        },
      ];

      const settlements: Settlement[] = [];
      const balances = calculateBalances(expenses, mockMembers, settlements);

      const aliceBalance = balances.find(b => b.userId === mockUserId1);
      const bobBalance = balances.find(b => b.userId === mockUserId2);

      expect(aliceBalance?.balance).toBe(0);
      expect(bobBalance?.balance).toBe(0);
    });
  });
});