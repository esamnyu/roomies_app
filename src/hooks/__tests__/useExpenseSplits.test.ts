import { renderHook, act } from '@testing-library/react';
import { useExpenseSplits } from '../useExpenseSplits';
import type { HouseholdMember, Expense } from '@/lib/types/types';

describe('useExpenseSplits', () => {
  const mockMembers: HouseholdMember[] = [
    { 
      id: 'hm-1',
      household_id: 'house-1',
      user_id: '550e8400-e29b-41d4-a716-446655440001', 
      role: 'admin',
      joined_at: '2024-01-01T00:00:00Z',
      profiles: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Alice',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    },
    { 
      id: 'hm-2',
      household_id: 'house-1',
      user_id: '550e8400-e29b-41d4-a716-446655440002', 
      role: 'member',
      joined_at: '2024-01-01T00:00:00Z',
      profiles: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Bob',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    },
    { 
      id: 'hm-3',
      household_id: 'house-1',
      user_id: '550e8400-e29b-41d4-a716-446655440003', 
      role: 'member',
      joined_at: '2024-01-01T00:00:00Z',
      profiles: {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Charlie',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    }
  ];

  describe('Resilience Tests', () => {
    it('handles invalid member data gracefully', () => {
      const invalidMembers = [
        { 
          id: 'hm-invalid',
          household_id: 'house-1',
          user_id: 'invalid-uuid', // Invalid UUID
          role: 'member' as const,
          joined_at: '2024-01-01T00:00:00Z'
        },
        ...mockMembers
      ];
      
      const { result } = renderHook(() => useExpenseSplits(invalidMembers));
      
      // Should filter out invalid members
      expect(result.current.includedMembers.size).toBe(3);
    });

    it('prevents negative amounts', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(-100);
      });
      
      expect(result.current.amount).toBe(0);
    });

    it('prevents removing the last member', () => {
      const { result } = renderHook(() => useExpenseSplits([mockMembers[0]]));
      
      act(() => {
        result.current.toggleMemberInclusion(mockMembers[0].user_id);
      });
      
      expect(result.current.includedMembers.has(mockMembers[0].user_id)).toBe(true);
    });

    it('validates amount boundaries', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(1000000); // Above max
      });
      
      expect(result.current.amount).toBe(0);
      
      act(() => {
        result.current.setAmount(999999.99); // At max
      });
      
      expect(result.current.amount).toBe(999999.99);
    });

    it('handles NaN and Infinity gracefully', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(NaN);
      });
      expect(result.current.amount).toBe(0);
      
      act(() => {
        result.current.setAmount(Infinity);
      });
      expect(result.current.amount).toBe(0);
    });
  });

  describe('Efficiency Tests', () => {
    it('memoizes final splits correctly', () => {
      const { result, rerender } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(300);
      });
      
      const splits1 = result.current.finalSplits;
      
      // Rerender without changing relevant state
      rerender();
      
      const splits2 = result.current.finalSplits;
      
      // Should be the same reference
      expect(splits1).toBe(splits2);
    });

    it('only recalculates when dependencies change', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(300);
      });
      
      const splits1 = result.current.finalSplits;
      
      act(() => {
        result.current.setAmount(300); // Same amount
      });
      
      const splits2 = result.current.finalSplits;
      
      expect(splits1).toBe(splits2);
    });
  });

  describe('Split Calculations', () => {
    it('calculates equal splits correctly', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(300);
        result.current.setSplitType('equal');
      });
      
      expect(result.current.finalSplits).toHaveLength(3);
      result.current.finalSplits.forEach(split => {
        expect(split.amount).toBe(100);
      });
      expect(result.current.totalSplitValue).toBe(300);
    });

    it('handles rounding errors in equal splits', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(100);
        result.current.setSplitType('equal');
      });
      
      // 100/3 = 33.33... each
      const totalSplit = result.current.finalSplits.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSplit).toBe(100);
      expect(result.current.isValid).toBe(true);
    });

    it('validates custom splits correctly', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(300);
        result.current.setSplitType('custom');
        result.current.setCustomSplit(mockMembers[0].user_id, 150);
        result.current.setCustomSplit(mockMembers[1].user_id, 100);
        result.current.setCustomSplit(mockMembers[2].user_id, 50);
      });
      
      expect(result.current.isValid).toBe(true);
      expect(result.current.totalSplitValue).toBe(300);
    });

    it('detects invalid custom splits', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(300);
        result.current.setSplitType('custom');
        result.current.setCustomSplit(mockMembers[0].user_id, 150);
        result.current.setCustomSplit(mockMembers[1].user_id, 100);
        // Missing split for third member
      });
      
      expect(result.current.isValid).toBe(false);
      expect(result.current.validationErrors.some(error => 
        error.includes("Split amounts don't match total")
      )).toBe(true);
    });

    it('calculates percentage splits correctly', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(200);
        result.current.setSplitType('percentage');
        result.current.setPercentageSplit(mockMembers[0].user_id, 50);
        result.current.setPercentageSplit(mockMembers[1].user_id, 30);
        result.current.setPercentageSplit(mockMembers[2].user_id, 20);
      });
      
      expect(result.current.finalSplits[0].amount).toBe(100); // 50% of 200
      expect(result.current.finalSplits[1].amount).toBe(60);  // 30% of 200
      expect(result.current.finalSplits[2].amount).toBe(40);  // 20% of 200
      expect(result.current.isValid).toBe(true);
    });

    it('auto-distributes percentages when switching to percentage mode', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(300);
        result.current.setSplitType('percentage');
      });
      
      // Should auto-distribute to ~33.33% each
      expect(result.current.totalPercentageValue).toBeCloseTo(100, 10);
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Initial Expense Loading', () => {
    it('loads initial expense with custom splits', () => {
      const initialExpense: Expense = {
        id: 'exp-1',
        household_id: 'house-1',
        amount: 450,
        description: 'Groceries',
        date: '2024-01-01',
        paid_by: mockMembers[0].user_id,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        expense_splits: [
          { 
            id: 'split-1',
            expense_id: 'exp-1', 
            user_id: mockMembers[0].user_id, 
            amount: 200,
            settled: false
          },
          { 
            id: 'split-2',
            expense_id: 'exp-1', 
            user_id: mockMembers[1].user_id, 
            amount: 150,
            settled: false
          },
          { 
            id: 'split-3',
            expense_id: 'exp-1', 
            user_id: mockMembers[2].user_id, 
            amount: 100,
            settled: false
          }
        ]
      };
      
      const { result } = renderHook(() => useExpenseSplits(mockMembers, initialExpense));
      
      expect(result.current.amount).toBe(450);
      expect(result.current.splitType).toBe('custom');
      expect(result.current.customSplits[mockMembers[0].user_id]).toBe(200);
      expect(result.current.customSplits[mockMembers[1].user_id]).toBe(150);
      expect(result.current.customSplits[mockMembers[2].user_id]).toBe(100);
    });

    it('handles initial expense with no splits', () => {
      const initialExpense: Expense = {
        id: 'exp-1',
        household_id: 'house-1',
        amount: 300,
        description: 'Rent',
        date: '2024-01-01',
        paid_by: mockMembers[0].user_id,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        expense_splits: []
      };
      
      const { result } = renderHook(() => useExpenseSplits(mockMembers, initialExpense));
      
      expect(result.current.amount).toBe(300);
      expect(result.current.splitType).toBe('equal');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty members array', () => {
      const { result } = renderHook(() => useExpenseSplits([]));
      
      expect(result.current.includedMembers.size).toBe(0);
      expect(result.current.finalSplits).toHaveLength(0);
      expect(result.current.isValid).toBe(false);
    });

    it('handles very small amounts', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(0.01);
        result.current.setSplitType('equal');
      });
      
      const totalSplit = result.current.finalSplits.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSplit).toBeCloseTo(0.01, 2);
    });

    it('resets to equal split correctly', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(300);
        result.current.setSplitType('custom');
        result.current.setCustomSplit(mockMembers[0].user_id, 200);
        result.current.setCustomSplit(mockMembers[1].user_id, 100);
        result.current.resetToEqual();
      });
      
      expect(result.current.splitType).toBe('equal');
      expect(result.current.customSplits).toEqual({});
      expect(result.current.includedMembers.size).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('handles members with missing profile data', () => {
      const membersWithMissingProfiles: HouseholdMember[] = [
        { 
          id: 'hm-1',
          household_id: 'house-1',
          user_id: '550e8400-e29b-41d4-a716-446655440001', 
          role: 'admin',
          joined_at: '2024-01-01T00:00:00Z'
          // No profiles property
        }
      ];
      
      const { result } = renderHook(() => useExpenseSplits(membersWithMissingProfiles));
      
      // Should still work with user_id only
      expect(result.current.includedMembers.size).toBe(1);
      expect(result.current.includedMembers.has(membersWithMissingProfiles[0].user_id)).toBe(true);
    });

    it('provides detailed validation errors', () => {
      const { result } = renderHook(() => useExpenseSplits(mockMembers));
      
      act(() => {
        result.current.setAmount(0);
        result.current.toggleMemberInclusion(mockMembers[0].user_id);
        result.current.toggleMemberInclusion(mockMembers[1].user_id);
        result.current.toggleMemberInclusion(mockMembers[2].user_id);
      });
      
      expect(result.current.isValid).toBe(false);
      expect(result.current.validationErrors).toContain('Amount must be greater than 0');
      expect(result.current.validationErrors).toContain('At least one member must be included');
    });
  });
});