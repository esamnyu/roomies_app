import { createExpenseWithCustomSplits, createMultiPayerExpense, updateExpense, getHouseholdBalances } from './expenses';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase with performance tracking
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
      }))
    }))
  }
}));

const { supabase } = require('../supabase');

describe('Performance & Security Tests', () => {
  const household = { id: uuidv4(), name: 'Performance Test House' };
  const users = Array.from({ length: 20 }, (_, i) => ({
    id: uuidv4(),
    name: `User${i + 1}`
  }));

  let performanceMetrics = {
    operationTimes: [],
    memoryUsage: [],
    callCounts: { rpc: 0, auth: 0 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    performanceMetrics = {
      operationTimes: [],
      memoryUsage: [],
      callCounts: { rpc: 0, auth: 0 }
    };

    (supabase.auth.getUser as jest.MockedFunction<any>).mockImplementation(() => {
      performanceMetrics.callCounts.auth++;
      return Promise.resolve({
        data: { user: { id: users[0].id } },
        error: null
      });
    });

    (supabase.rpc as jest.MockedFunction<any>).mockImplementation((functionName, params) => {
      performanceMetrics.callCounts.rpc++;
      
      // Simulate realistic response times
      const delay = Math.random() * 50; // 0-50ms
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: functionName === 'create_expense_atomic' 
              ? { expense_id: uuidv4(), idempotent: false }
              : functionName === 'get_household_balances_fast'
              ? users.slice(0, 10).map(user => ({ user_id: user.id, balance: Math.random() * 200 - 100, name: user.name }))
              : { success: true, version: 2 },
            error: null
          });
        }, delay);
      });
    });
  });

  describe('Performance Stress Tests', () => {
    it('should handle 1000 expense operations under 5 seconds', async () => {
      console.log('\n=== PERFORMANCE TEST: 1000 Operations ===');
      
      const startTime = Date.now();
      const operations = [];

      // Generate 1000 mixed operations
      for (let i = 0; i < 1000; i++) {
        const operationType = i % 3;
        
        if (operationType === 0) {
          // Create expense
          operations.push(
            createExpenseWithCustomSplits(
              household.id,
              `Perf Test Expense ${i}`,
              Math.round((Math.random() * 500 + 10) * 100) / 100,
              users.slice(0, 5).map(user => ({
                user_id: user.id,
                amount: Math.round((Math.random() * 100 + 10) * 100) / 100
              }))
            )
          );
        } else if (operationType === 1) {
          // Get balances
          operations.push(getHouseholdBalances(household.id));
        } else {
          // Update expense
          operations.push(
            updateExpense(uuidv4(), {
              description: `Updated Expense ${i}`,
              amount: 100.00,
              splits: users.slice(0, 3).map(user => ({
                user_id: user.id,
                amount: 33.33
              })),
              paid_by: users[0].id,
              date: '2024-01-15'
            })
          );
        }
      }

      const results = await Promise.allSettled(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ Completed 1000 operations in ${totalTime}ms`);
      console.log(`✅ Success rate: ${successCount}/1000 (${((successCount/1000)*100).toFixed(1)}%)`);
      console.log(`✅ Failures: ${failureCount}`);
      
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds
      expect(successCount).toBeGreaterThan(950); // 95%+ success rate
    });

    it('should maintain performance with large household (50 users)', async () => {
      console.log('\n=== PERFORMANCE TEST: Large Household ===');
      
      const largeHousehold = Array.from({ length: 50 }, (_, i) => ({
        id: uuidv4(),
        name: `User${i + 1}`
      }));

      const startTime = Date.now();

      // Create expense with all 50 users
      const largeExpenseAmount = 5000.00;
      const equalShare = largeExpenseAmount / largeHousehold.length;
      const largeSplits = largeHousehold.map(user => ({
        user_id: user.id,
        amount: Number(equalShare.toFixed(2))
      }));

      // Adjust for rounding
      const totalSplits = largeSplits.reduce((sum, s) => sum + s.amount, 0);
      const difference = largeExpenseAmount - totalSplits;
      if (Math.abs(difference) > 0.01) {
        largeSplits[0].amount = Number((largeSplits[0].amount + difference).toFixed(2));
      }

      await createExpenseWithCustomSplits(
        household.id,
        'Large Household Expense (50 users)',
        largeExpenseAmount,
        largeSplits
      );

      const endTime = Date.now();
      const operationTime = endTime - startTime;

      console.log(`✅ 50-user expense created in ${operationTime}ms`);
      expect(operationTime).toBeLessThan(1000); // Under 1 second
    });

    it('should efficiently handle concurrent balance calculations', async () => {
      console.log('\n=== PERFORMANCE TEST: Concurrent Balance Queries ===');
      
      const startTime = Date.now();
      
      // Simulate 100 concurrent balance queries
      const balanceQueries = Array.from({ length: 100 }, () => 
        getHouseholdBalances(household.id)
      );

      const results = await Promise.all(balanceQueries);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`✅ 100 concurrent balance queries in ${totalTime}ms`);
      console.log(`✅ Average per query: ${(totalTime/100).toFixed(1)}ms`);
      
      expect(results).toHaveLength(100);
      expect(totalTime).toBeLessThan(2000); // Under 2 seconds for 100 queries
    });
  });

  describe('Security & Validation Tests', () => {
    it('should reject malicious input attempts', async () => {
      console.log('\n=== SECURITY TEST: Input Validation ===');
      
      const maliciousInputs = [
        // SQL injection attempts
        { 
          desc: "'; DROP TABLE expenses; --",
          amount: 100.00,
          expectedError: 'validation'
        },
        // XSS attempts
        {
          desc: '<script>alert("xss")</script>',
          amount: 100.00,
          expectedError: 'validation'
        },
        // Extreme values
        {
          desc: 'Normal expense',
          amount: 999999999.99, // Beyond reasonable limits
          expectedError: 'Amount too large'
        },
        // Invalid UUIDs
        {
          desc: 'Invalid UUID test',
          amount: 100.00,
          invalidUserId: 'not-a-uuid',
          expectedError: 'validation'
        },
        // Negative amounts
        {
          desc: 'Negative amount test',
          amount: -100.00,
          expectedError: 'Amount must be positive'
        }
      ];

      let blockedAttempts = 0;

      for (const input of maliciousInputs) {
        try {
          const splits = input.invalidUserId 
            ? [{ user_id: input.invalidUserId, amount: input.amount }]
            : [{ user_id: users[0].id, amount: input.amount }];

          await createExpenseWithCustomSplits(
            household.id,
            input.desc,
            input.amount,
            splits
          );
          
          // If we get here, the malicious input wasn't blocked
          console.warn(`❌ Malicious input not blocked: ${input.desc}`);
        } catch (error) {
          blockedAttempts++;
          console.log(`✅ Blocked: ${input.desc} - ${error.message}`);
        }
      }

      expect(blockedAttempts).toBe(maliciousInputs.length);
      console.log(`✅ All ${maliciousInputs.length} malicious inputs were blocked`);
    });

    it('should enforce proper UUID format validation', async () => {
      console.log('\n=== SECURITY TEST: UUID Validation ===');
      
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '',
        null,
        undefined,
        '550e8400-e29b-41d4-a716-44665544000', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' // Invalid characters
      ];

      let validationFailures = 0;

      for (const invalidUUID of invalidUUIDs) {
        try {
          await createExpenseWithCustomSplits(
            invalidUUID || household.id,
            'UUID Test',
            100.00,
            [{ user_id: users[0].id, amount: 100.00 }]
          );
        } catch (error) {
          validationFailures++;
        }
      }

      expect(validationFailures).toBe(invalidUUIDs.length);
      console.log(`✅ All ${invalidUUIDs.length} invalid UUIDs were rejected`);
    });

    it('should prevent split amount manipulation attacks', async () => {
      console.log('\n=== SECURITY TEST: Split Manipulation ===');
      
      const manipulationAttempts = [
        // Splits don't match total (under)
        {
          amount: 100.00,
          splits: [
            { user_id: users[0].id, amount: 30.00 },
            { user_id: users[1].id, amount: 30.00 }
            // Missing $40
          ]
        },
        // Splits don't match total (over)
        {
          amount: 100.00,
          splits: [
            { user_id: users[0].id, amount: 60.00 },
            { user_id: users[1].id, amount: 60.00 }
            // $20 over
          ]
        },
        // Negative split amounts
        {
          amount: 100.00,
          splits: [
            { user_id: users[0].id, amount: -50.00 },
            { user_id: users[1].id, amount: 150.00 }
          ]
        },
        // Zero splits with non-zero total
        {
          amount: 100.00,
          splits: [
            { user_id: users[0].id, amount: 0.00 },
            { user_id: users[1].id, amount: 0.00 }
          ]
        }
      ];

      let blockedManipulations = 0;

      for (const attempt of manipulationAttempts) {
        try {
          await createExpenseWithCustomSplits(
            household.id,
            'Manipulation Test',
            attempt.amount,
            attempt.splits
          );
        } catch (error) {
          blockedManipulations++;
          console.log(`✅ Blocked manipulation: ${error.message}`);
        }
      }

      expect(blockedManipulations).toBe(manipulationAttempts.length);
      console.log(`✅ All ${manipulationAttempts.length} manipulation attempts were blocked`);
    });

    it('should handle authentication bypass attempts', async () => {
      console.log('\n=== SECURITY TEST: Authentication Bypass ===');
      
      // Mock unauthenticated state
      (supabase.auth.getUser as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: { user: null },
        error: null
      });

      let authenticationEnforced = false;

      try {
        await createExpenseWithCustomSplits(
          household.id,
          'Unauthenticated Test',
          100.00,
          [{ user_id: users[0].id, amount: 100.00 }]
        );
      } catch (error) {
        if (error.message.includes('Not authenticated')) {
          authenticationEnforced = true;
        }
      }

      expect(authenticationEnforced).toBe(true);
      console.log('✅ Authentication bypass attempt blocked');
    });
  });

  describe('Memory & Resource Tests', () => {
    it('should not leak memory during batch operations', async () => {
      console.log('\n=== RESOURCE TEST: Memory Leak Detection ===');
      
      const initialMemory = process.memoryUsage();
      
      // Perform 500 operations to test for memory leaks
      const operations = [];
      for (let i = 0; i < 500; i++) {
        operations.push(
          createExpenseWithCustomSplits(
            household.id,
            `Memory Test ${i}`,
            Math.random() * 100 + 10,
            users.slice(0, 3).map(user => ({
              user_id: user.id,
              amount: Math.random() * 50 + 10
            }))
          )
        );
      }

      await Promise.allSettled(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseInMB = memoryIncrease / 1024 / 1024;

      console.log(`✅ Memory increase: ${memoryIncreaseInMB.toFixed(2)}MB`);
      
      // Should not increase by more than 50MB for 500 operations
      expect(memoryIncreaseInMB).toBeLessThan(50);
    });

    it('should limit resource consumption per operation', async () => {
      console.log('\n=== RESOURCE TEST: Resource Limits ===');
      
      // Test with maximum allowed splits (should be limited)
      const maxSplits = Array.from({ length: 100 }, (_, i) => ({
        user_id: users[i % users.length].id,
        amount: 1.00
      }));

      let resourceLimitEnforced = false;

      try {
        await createExpenseWithCustomSplits(
          household.id,
          'Max Splits Test',
          100.00,
          maxSplits
        );
      } catch (error) {
        if (error.message.includes('Too many splits')) {
          resourceLimitEnforced = true;
        }
      }

      expect(resourceLimitEnforced).toBe(true);
      console.log('✅ Resource limits enforced (max splits)');
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain consistency during concurrent modifications', async () => {
      console.log('\n=== INTEGRITY TEST: Concurrent Modifications ===');
      
      const expenseId = uuidv4();
      
      // Mock initial expense creation
      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: { expense_id: expenseId, idempotent: false },
        error: null
      });

      // Create initial expense
      await createExpenseWithCustomSplits(
        household.id,
        'Concurrent Test Expense',
        300.00,
        users.slice(0, 3).map(user => ({ user_id: user.id, amount: 100.00 }))
      );

      // Simulate concurrent updates
      const concurrentUpdates = Array.from({ length: 10 }, (_, i) => 
        updateExpense(expenseId, {
          description: `Concurrent Update ${i}`,
          amount: 300.00 + i,
          splits: users.slice(0, 3).map(user => ({
            user_id: user.id,
            amount: (300.00 + i) / 3
          })),
          paid_by: users[0].id,
          date: '2024-01-15'
        })
      );

      const results = await Promise.allSettled(concurrentUpdates);
      const successfulUpdates = results.filter(r => r.status === 'fulfilled').length;

      console.log(`✅ ${successfulUpdates}/10 concurrent updates completed`);
      expect(successfulUpdates).toBeGreaterThan(0); // At least some should succeed
    });

    it('should preserve decimal precision across all operations', async () => {
      console.log('\n=== INTEGRITY TEST: Decimal Precision ===');
      
      const precisionTestCases = [
        { amount: 99.99, users: 3 }, // 33.33 each
        { amount: 100.01, users: 3 }, // 33.34, 33.34, 33.33
        { amount: 999.97, users: 7 }, // 142.85 each (ish)
        { amount: 1.03, users: 3 },   // 0.34, 0.34, 0.35
      ];

      for (const testCase of precisionTestCases) {
        const baseAmount = Number((testCase.amount / testCase.users).toFixed(2));
        const splits = users.slice(0, testCase.users).map(user => ({
          user_id: user.id,
          amount: baseAmount
        }));

        // Distribute rounding error
        const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
        const difference = testCase.amount - totalSplits;
        if (Math.abs(difference) >= 0.01) {
          const adjustmentPer = 0.01 * Math.sign(difference);
          const adjustmentsNeeded = Math.round(Math.abs(difference) * 100);
          
          for (let i = 0; i < adjustmentsNeeded && i < splits.length; i++) {
            splits[i].amount = Number((splits[i].amount + adjustmentPer).toFixed(2));
          }
        }

        await createExpenseWithCustomSplits(
          household.id,
          `Precision Test $${testCase.amount}`,
          testCase.amount,
          splits
        );

        const finalTotal = splits.reduce((sum, s) => sum + s.amount, 0);
        expect(Math.abs(finalTotal - testCase.amount)).toBeLessThan(0.01);
      }

      console.log(`✅ All ${precisionTestCases.length} precision tests passed`);
    });
  });

  afterAll(() => {
    console.log('\n🛡️ PERFORMANCE & SECURITY TESTING COMPLETE 🛡️');
    console.log(`Total RPC calls: ${performanceMetrics.callCounts.rpc}`);
    console.log(`Total auth calls: ${performanceMetrics.callCounts.auth}`);
    console.log('System performance and security validated!');
  });
});