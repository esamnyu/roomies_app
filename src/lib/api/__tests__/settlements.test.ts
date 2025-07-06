// src/lib/api/__tests__/settlements.test.ts
import { getHouseholdBalances, getSettlementSuggestions, createSettlement } from '../settlements';
import { supabase } from '../../supabase';
import type { HouseholdMember, Profile } from '../../types/types';

// Mock Supabase to prevent actual API calls during tests
jest.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => ({ data: { user: { id: 'user-2' } } })),
    },
    rpc: jest.fn(),
  },
}));

// Cast the mock for type safety in tests
const supabaseMock = supabase as jest.Mocked<typeof supabase>;

describe('Settlements API', () => {
  const mockHouseholdId = 'household-123';
  const mockUserId1 = 'user-1'; // Alice
  const mockUserId2 = 'user-2'; // Bob
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

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getHouseholdBalances', () => {
    it('should call supabase.rpc with correct parameters and return mapped data', async () => {
      const mockRpcResponse = [
        { userid: mockUserId1, balance: 100, profile: mockProfiles[mockUserId1] },
        { userid: mockUserId2, balance: -100, profile: mockProfiles[mockUserId2] },
      ];
      
      supabaseMock.rpc.mockResolvedValue({ data: mockRpcResponse, error: null, count: null, status: 200, statusText: 'OK' });

      const balances = await getHouseholdBalances(mockHouseholdId);

      expect(supabaseMock.rpc).toHaveBeenCalledWith('calculate_household_balances', {
        p_household_id: mockHouseholdId,
      });

      expect(balances).toEqual([
        { userId: mockUserId1, balance: 100, profile: mockProfiles[mockUserId1] },
        { userId: mockUserId2, balance: -100, profile: mockProfiles[mockUserId2] },
      ]);
    });

    it('should throw an error if the rpc call fails', async () => {
      const mockError = { name: 'PostgrestError', message: 'RPC Error', details: '', hint: '', code: '' };
      supabaseMock.rpc.mockResolvedValue({ data: null, error: mockError, count: null, status: 500, statusText: 'Internal Server Error' });

      await expect(getHouseholdBalances(mockHouseholdId)).rejects.toThrow('RPC Error');
    });

    it('should return an empty array if RPC returns null data', async () => {
      supabaseMock.rpc.mockResolvedValue({ data: null, error: null, count: null, status: 200, statusText: 'OK' });
      const balances = await getHouseholdBalances(mockHouseholdId);
      expect(balances).toEqual([]);
    });
  });

  describe('getSettlementSuggestions', () => {
    it('should suggest optimal settlements for a simple case', () => {
      const balances = [
        { userId: mockUserId1, balance: 50, profile: mockProfiles[mockUserId1] }, // Alice owed 50
        { userId: mockUserId2, balance: -30, profile: mockProfiles[mockUserId2] }, // Bob owes 30
        { userId: mockUserId3, balance: -20, profile: mockProfiles[mockUserId3] }, // Charlie owes 20
      ];

      const suggestions = getSettlementSuggestions(balances);

      expect(suggestions.length).toBe(2);
      expect(suggestions).toContainEqual({
        from: mockUserId2,
        to: mockUserId1,
        amount: 30,
        fromProfile: mockProfiles[mockUserId2],
        toProfile: mockProfiles[mockUserId1],
      });
      expect(suggestions).toContainEqual({
        from: mockUserId3,
        to: mockUserId1,
        amount: 20,
        fromProfile: mockProfiles[mockUserId3],
        toProfile: mockProfiles[mockUserId1],
      });
    });

    it('should handle more complex settlement scenarios', () => {
        const balances = [
          { userId: 'userA', balance: 100, profile: {id: 'userA', name: 'User A'} as Profile },
          { userId: 'userB', balance: -60, profile: {id: 'userB', name: 'User B'} as Profile },
          { userId: 'userC', balance: -40, profile: {id: 'userC', name: 'User C'} as Profile },
        ];
  
        const suggestions = getSettlementSuggestions(balances);
  
        expect(suggestions.length).toBe(2);
        // User B owes 60 and pays User A
        const suggestion1 = suggestions.find(s => s.from === 'userB');
        expect(suggestion1?.to).toBe('userA');
        expect(suggestion1?.amount).toBe(60);
  
        // User C owes 40 and pays User A
        const suggestion2 = suggestions.find(s => s.from === 'userC');
        expect(suggestion2?.to).toBe('userA');
        expect(suggestion2?.amount).toBe(40);
    });

    it('should return no suggestions if everyone is settled up', () => {
      const balances = [
        { userId: mockUserId1, balance: 0, profile: mockProfiles[mockUserId1] },
        { userId: mockUserId2, balance: 0, profile: mockProfiles[mockUserId2] },
      ];
      const suggestions = getSettlementSuggestions(balances);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('createSettlement', () => {
    it('should call the create_settlement_and_notify RPC with correct parameters', async () => {
        const settlementToCreate = {
            household_id: mockHouseholdId,
            payer_id: mockUserId2,
            payee_id: mockUserId1,
            amount: 50,
            description: 'Paying back for pizza',
        };

        const mockRpcResponse = { ...settlementToCreate, id: 'settle-456', created_at: new Date().toISOString() };
        
        // Mock the chained calls for this specific RPC
        const single = jest.fn().mockResolvedValue({ data: mockRpcResponse, error: null });
        const select = jest.fn().mockReturnValue({ single });
        supabaseMock.rpc.mockReturnValue({ select });

        await createSettlement(settlementToCreate);

        expect(supabaseMock.rpc).toHaveBeenCalledWith('create_settlement_and_notify', {
            p_household_id: settlementToCreate.household_id,
            p_payer_id: settlementToCreate.payer_id,
            p_payee_id: settlementToCreate.payee_id,
            p_amount: settlementToCreate.amount,
            p_description: settlementToCreate.description,
        });

        expect(select).toHaveBeenCalledWith(expect.stringContaining('payer_profile:profiles'));
        expect(single).toHaveBeenCalled();
    });
  });
});