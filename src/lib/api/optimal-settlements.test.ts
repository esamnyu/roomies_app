import { describe, it, expect } from '@jest/globals';
import { 
  getOptimalSettlementSuggestions, 
  AdaptiveSettlementSolver,
  type Balance,
  type Settlement 
} from './optimal-settlements';

// Mock profile data
const createMockProfile = (name: string) => ({
  name,
  avatar_url: `avatar-${name}`,
  user_id: name.toLowerCase()
});

// Helper to create balance object
const createBalance = (userId: string, amount: number): Balance => ({
  userId,
  balance: amount,
  profile: createMockProfile(userId)
});

// Helper to verify settlements balance out
const verifySettlementsBalance = (balances: Balance[], settlements: Settlement[]) => {
  const netBalances = new Map<string, number>();
  
  // Initialize with original balances
  balances.forEach(b => netBalances.set(b.userId, b.balance));
  
  // Apply settlements
  settlements.forEach(s => {
    netBalances.set(s.from, (netBalances.get(s.from) || 0) + s.amount);
    netBalances.set(s.to, (netBalances.get(s.to) || 0) - s.amount);
  });
  
  // All balances should be near zero
  for (const [_, balance] of netBalances) {
    expect(Math.abs(balance)).toBeLessThan(0.01);
  }
};

describe('Optimal Settlement Algorithm', () => {
  describe('Edge Cases', () => {
    it('handles empty balances', () => {
      const result = getOptimalSettlementSuggestions([]);
      expect(result).toEqual([]);
    });

    it('handles all zero balances', () => {
      const balances = [
        createBalance('A', 0),
        createBalance('B', 0),
        createBalance('C', 0)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      expect(result).toEqual([]);
    });

    it('handles single person with balance', () => {
      const balances = [createBalance('A', 100)];
      const result = getOptimalSettlementSuggestions(balances);
      expect(result).toEqual([]);
    });

    it('ignores tiny balances under 0.01', () => {
      const balances = [
        createBalance('A', 0.005),
        createBalance('B', -0.005)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      expect(result).toEqual([]);
    });
  });

  describe('Small Groups (2-6 users) - Exact Minimal', () => {
    it('handles simple 2-person debt', () => {
      const balances = [
        createBalance('A', -50),
        createBalance('B', 50)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        from: 'A',
        to: 'B',
        amount: 50
      });
      verifySettlementsBalance(balances, result);
    });

    it('finds exact matches for 3 people', () => {
      const balances = [
        createBalance('A', -30),
        createBalance('B', -20),
        createBalance('C', 50)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      expect(result).toHaveLength(2);
      verifySettlementsBalance(balances, result);
    });

    it('optimizes 4-person circular debt', () => {
      const balances = [
        createBalance('A', -40),
        createBalance('B', 20),
        createBalance('C', -30),
        createBalance('D', 50)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      // Should produce minimal transactions
      expect(result.length).toBeLessThanOrEqual(3);
      verifySettlementsBalance(balances, result);
    });

    it('handles complex 6-person scenario optimally', () => {
      const balances = [
        createBalance('A', -100),
        createBalance('B', 40),
        createBalance('C', -60),
        createBalance('D', 80),
        createBalance('E', -20),
        createBalance('F', 60)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      // Should find near-optimal solution
      expect(result.length).toBeLessThanOrEqual(4);
      verifySettlementsBalance(balances, result);
    });

    it('handles exact opposite balances', () => {
      const balances = [
        createBalance('A', -25.50),
        createBalance('B', 25.50)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(25.50);
      verifySettlementsBalance(balances, result);
    });
  });

  describe('Medium Groups (7-12 users) - Clustering', () => {
    it('handles 8-person group efficiently', () => {
      const balances = [
        createBalance('A', -80),
        createBalance('B', 30),
        createBalance('C', -40),
        createBalance('D', 50),
        createBalance('E', -20),
        createBalance('F', 35),
        createBalance('G', -15),
        createBalance('H', 40)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      // Should produce reasonable number of transactions
      expect(result.length).toBeLessThanOrEqual(6);
      verifySettlementsBalance(balances, result);
    });

    it('groups similar balance magnitudes', () => {
      const balances = [
        // Large balances
        createBalance('A', -200),
        createBalance('B', 180),
        // Medium balances
        createBalance('C', -50),
        createBalance('D', 45),
        createBalance('E', -40),
        createBalance('F', 35),
        // Small balances
        createBalance('G', -10),
        createBalance('H', 15),
        createBalance('I', -5),
        createBalance('J', 30)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      expect(result.length).toBeLessThanOrEqual(8);
      verifySettlementsBalance(balances, result);
    });
  });

  describe('Large Groups (13-20 users) - Heuristic', () => {
    it('handles 15-person group with good approximation', () => {
      const balances = Array.from({ length: 15 }, (_, i) => {
        const amount = (i % 2 === 0 ? -1 : 1) * (10 + i * 5);
        return createBalance(`User${i}`, amount);
      });
      
      // Ensure balances sum to zero
      const sum = balances.reduce((acc, b) => acc + b.balance, 0);
      balances[0].balance -= sum;
      
      const result = getOptimalSettlementSuggestions(balances);
      
      // Should handle in reasonable number of transactions
      // For 15 users, theoretical minimum is 14, so 14 is excellent
      expect(result.length).toBeLessThanOrEqual(14);
      verifySettlementsBalance(balances, result);
    });

    it('finds exact matches first in large groups', () => {
      const balances = [
        // Exact matches
        createBalance('A', -100),
        createBalance('B', 100),
        createBalance('C', -50),
        createBalance('D', 50),
        // Other balances
        ...Array.from({ length: 10 }, (_, i) => 
          createBalance(`User${i + 5}`, i % 2 === 0 ? -15 : 15)
        )
      ];
      
      const result = getOptimalSettlementSuggestions(balances);
      
      // Should find the exact matches
      const exactMatches = result.filter(s => 
        (s.from === 'A' && s.to === 'B' && s.amount === 100) ||
        (s.from === 'C' && s.to === 'D' && s.amount === 50)
      );
      expect(exactMatches.length).toBeGreaterThanOrEqual(2);
      verifySettlementsBalance(balances, result);
    });
  });

  describe('Precision and Rounding', () => {
    it('handles floating point precision correctly', () => {
      const balances = [
        createBalance('A', -33.33),
        createBalance('B', -33.33),
        createBalance('C', 66.66)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      expect(result).toHaveLength(2);
      expect(result[0].amount + result[1].amount).toBeCloseTo(66.66, 2);
      verifySettlementsBalance(balances, result);
    });

    it('rounds to 2 decimal places', () => {
      const balances = [
        createBalance('A', -10.12567),
        createBalance('B', 10.12567)
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      expect(result[0].amount).toBe(10.13);
    });
  });

  describe('Real-world Scenarios', () => {
    it('handles typical roommate scenario', () => {
      // Rent split scenario
      const balances = [
        createBalance('Alice', -850),   // Paid rent
        createBalance('Bob', 283.33),   // Owes 1/3
        createBalance('Charlie', 283.33), // Owes 1/3
        createBalance('David', 283.34)   // Owes 1/3 + rounding
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      expect(result).toHaveLength(3);
      verifySettlementsBalance(balances, result);
    });

    it('handles group dinner with uneven splits', () => {
      const balances = [
        createBalance('Host', -156.80),  // Paid for dinner
        createBalance('Guest1', 22.40),   // Had appetizer + main
        createBalance('Guest2', 35.20),   // Had full meal + drinks
        createBalance('Guest3', 18.50),   // Just main course
        createBalance('Guest4', 42.30),   // Full meal + expensive wine
        createBalance('Guest5', 38.40)    // Full meal + dessert
      ];
      const result = getOptimalSettlementSuggestions(balances);
      
      expect(result).toHaveLength(5);
      verifySettlementsBalance(balances, result);
    });
  });

  describe('Performance', () => {
    it('completes small groups in under 5ms', () => {
      const balances = Array.from({ length: 6 }, (_, i) => 
        createBalance(`User${i}`, i % 2 === 0 ? -50 : 50)
      );
      
      const start = performance.now();
      const result = getOptimalSettlementSuggestions(balances);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(5);
      verifySettlementsBalance(balances, result);
    });

    it('completes large groups in under 50ms', () => {
      const balances = Array.from({ length: 20 }, (_, i) => 
        createBalance(`User${i}`, i % 2 === 0 ? -(10 + i) : (10 + i))
      );
      
      // Ensure balances sum to zero
      const sum = balances.reduce((acc, b) => acc + b.balance, 0);
      if (Math.abs(sum) > 0.01) {
        balances[0].balance -= sum;
      }
      
      const start = performance.now();
      const result = getOptimalSettlementSuggestions(balances);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(50);
      verifySettlementsBalance(balances, result);
    });
  });
});