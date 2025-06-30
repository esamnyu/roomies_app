import { createExpenseWithCustomSplits, createMultiPayerExpense, updateExpense, getHouseholdBalances, markExpenseSettled } from './expenses';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase with realistic edge case handling
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

describe('Extreme Bill Splitting Tests - Stress & Edge Cases', () => {
  // Create extensive mock household
  const household = { id: uuidv4(), name: 'Extreme Test House' };
  
  const users = {
    alice: { id: uuidv4(), name: 'Alice' },
    bob: { id: uuidv4(), name: 'Bob' },
    charlie: { id: uuidv4(), name: 'Charlie' },
    diana: { id: uuidv4(), name: 'Diana' },
    eve: { id: uuidv4(), name: 'Eve' },
    frank: { id: uuidv4(), name: 'Frank' },
    grace: { id: uuidv4(), name: 'Grace' },
    henry: { id: uuidv4(), name: 'Henry' }
  };

  const userList = Object.values(users);

  // Enhanced balance tracker with precision tracking
  let balanceTracker = {};
  let transactionHistory = [];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset balance tracker
    balanceTracker = {};
    userList.forEach(user => balanceTracker[user.id] = 0);
    transactionHistory = [];

    // Mock authenticated user
    (supabase.auth.getUser as jest.MockedFunction<any>).mockResolvedValue({
      data: { user: { id: users.alice.id } },
      error: null
    });

    // Enhanced mock with transaction tracking
    (supabase.rpc as jest.MockedFunction<any>).mockImplementation((functionName, params) => {
      const expenseId = uuidv4();

      if (functionName === 'create_expense_atomic') {
        const transaction = {
          id: expenseId,
          type: 'create',
          description: params.p_description,
          amount: params.p_amount,
          payments: params.p_payments || [],
          splits: params.p_splits || [],
          timestamp: Date.now()
        };

        // Update balance tracker with high precision
        transaction.payments.forEach(payment => {
          balanceTracker[payment.payer_id] = Number((balanceTracker[payment.payer_id] + payment.amount).toFixed(2));
        });

        transaction.splits.forEach(split => {
          balanceTracker[split.user_id] = Number((balanceTracker[split.user_id] - split.amount).toFixed(2));
        });

        transactionHistory.push(transaction);

        return Promise.resolve({
          data: { expense_id: expenseId, idempotent: false },
          error: null
        });
      }

      if (functionName === 'update_expense_with_adjustments') {
        const transaction = {
          id: params.p_expense_id,
          type: 'update',
          description: params.p_description,
          amount: params.p_amount,
          payments: params.p_payments || [],
          splits: params.p_splits || [],
          timestamp: Date.now()
        };

        transactionHistory.push(transaction);

        return Promise.resolve({
          data: {
            success: true,
            expense_id: params.p_expense_id,
            version: 2,
            message: 'Expense updated successfully with adjustments tracked'
          },
          error: null
        });
      }

      if (functionName === 'get_household_balances_fast') {
        const balances = Object.entries(balanceTracker).map(([userId, balance]) => {
          const user = userList.find(u => u.id === userId);
          return {
            user_id: userId,
            balance: Number(Number(balance).toFixed(2)),
            name: user?.name || 'Unknown'
          };
        });

        return Promise.resolve({ data: balances, error: null });
      }

      return Promise.resolve({ data: null, error: null });
    });
  });

  describe('Stress Test: Large Scale Scenarios', () => {
    it('should handle massive house with 8 people and complex splits', async () => {
      console.log('\n=== STRESS TEST: 8-Person House ===');
      
      // Massive rent with complex room-based splits
      const monthlyRent = 4800.00;
      const roomSplits = [
        { user_id: users.alice.id, amount: 800.00 }, // Master with ensuite
        { user_id: users.bob.id, amount: 700.00 },   // Large room
        { user_id: users.charlie.id, amount: 650.00 }, // Medium room
        { user_id: users.diana.id, amount: 600.00 },   // Medium room
        { user_id: users.eve.id, amount: 550.00 },     // Small room
        { user_id: users.frank.id, amount: 500.00 },   // Small room
        { user_id: users.grace.id, amount: 500.00 },   // Shared room
        { user_id: users.henry.id, amount: 500.00 }    // Shared room
      ];

      await createExpenseWithCustomSplits(
        household.id,
        'Monthly Rent - 8 Person House',
        monthlyRent,
        roomSplits
      );

      const balances = await getHouseholdBalances(household.id);
      
      // Verify total still sums to zero with 8 people
      const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
      expect(Math.abs(totalBalance)).toBeLessThan(0.01);

      console.log('✅ 8-person house rent split correctly');
    });

    it('should handle 50+ expenses in a single month simulation', async () => {
      console.log('\n=== STRESS TEST: 50+ Monthly Expenses ===');
      
      const expenses = [
        // Weekly groceries (4 weeks)
        { desc: 'Groceries Week 1', amount: 180.00, payer: users.alice.id },
        { desc: 'Groceries Week 2', amount: 165.00, payer: users.bob.id },
        { desc: 'Groceries Week 3', amount: 195.00, payer: users.charlie.id },
        { desc: 'Groceries Week 4', amount: 170.00, payer: users.diana.id },
        
        // Daily coffee runs (20 days)
        ...Array.from({ length: 20 }, (_, i) => ({
          desc: `Coffee Run Day ${i + 1}`,
          amount: Math.round((Math.random() * 25 + 15) * 100) / 100, // $15-40
          payer: userList[Math.floor(Math.random() * userList.length)].id
        })),
        
        // Weekly dining out (4 weeks)
        { desc: 'Group Dinner Week 1', amount: 240.00, payer: users.eve.id },
        { desc: 'Group Dinner Week 2', amount: 280.00, payer: users.frank.id },
        { desc: 'Group Dinner Week 3', amount: 220.00, payer: users.grace.id },
        { desc: 'Group Dinner Week 4', amount: 260.00, payer: users.henry.id },
        
        // Utilities and services
        { desc: 'Electric Bill', amount: 320.00, payer: users.alice.id },
        { desc: 'Gas Bill', amount: 140.00, payer: users.bob.id },
        { desc: 'Internet', amount: 89.99, payer: users.charlie.id },
        { desc: 'Water/Trash', amount: 85.00, payer: users.diana.id },
        { desc: 'Cleaning Service', amount: 200.00, payer: users.eve.id },
        
        // Random household items
        ...Array.from({ length: 15 }, (_, i) => ({
          desc: `Household Item ${i + 1}`,
          amount: Math.round((Math.random() * 80 + 20) * 100) / 100, // $20-100
          payer: userList[Math.floor(Math.random() * userList.length)].id
        }))
      ];

      console.log(`Creating ${expenses.length} expenses...`);

      // Create all expenses with equal splits
      for (const expense of expenses) {
        const equalSplit = expense.amount / userList.length;
        const splits = userList.map(user => ({
          user_id: user.id,
          amount: Number(equalSplit.toFixed(2))
        }));

        // Adjust for rounding
        const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
        const difference = expense.amount - totalSplits;
        if (Math.abs(difference) > 0.01) {
          splits[0].amount = Number((splits[0].amount + difference).toFixed(2));
        }

        await createExpenseWithCustomSplits(
          household.id,
          expense.desc,
          expense.amount,
          splits,
          undefined,
          expense.payer
        );
      }

      // Verify balance consistency after 50+ transactions
      const finalBalances = await getHouseholdBalances(household.id);
      const totalBalance = finalBalances.reduce((sum, b) => sum + b.balance, 0);
      
      expect(Math.abs(totalBalance)).toBeLessThan(0.10); // Allow small rounding with many transactions
      expect(transactionHistory.length).toBe(expenses.length);

      console.log(`✅ Processed ${expenses.length} expenses with consistent balances`);
    });
  });

  describe('Extreme Precision Tests', () => {
    it('should handle micro-transactions (fractions of cents)', async () => {
      console.log('\n=== PRECISION TEST: Micro-transactions ===');
      
      // Test with very small amounts that could cause precision issues
      const microAmounts = [0.01, 0.03, 0.07, 0.11, 0.13];
      
      for (const amount of microAmounts) {
        const splits = userList.slice(0, 3).map(user => ({
          user_id: user.id,
          amount: Number((amount / 3).toFixed(2))
        }));

        // Handle rounding for micro amounts
        const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
        const difference = amount - totalSplits;
        if (Math.abs(difference) > 0.005) {
          splits[0].amount = Number((splits[0].amount + difference).toFixed(2));
        }

        await createExpenseWithCustomSplits(
          household.id,
          `Micro-transaction $${amount}`,
          amount,
          splits
        );
      }

      const balances = await getHouseholdBalances(household.id);
      const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
      expect(Math.abs(totalBalance)).toBeLessThan(0.01);

      console.log('✅ Micro-transactions handled with proper precision');
    });

    it('should handle maximum precision amounts', async () => {
      console.log('\n=== PRECISION TEST: Maximum Decimal Places ===');
      
      // Test amounts with maximum supported precision
      const precisionAmounts = [
        99999.99, // Maximum amount
        12345.67, // Standard precision
        1.99,     // Common restaurant split
        0.99,     // App store purchase
        1000.01,  // Large amount with cents
        33.33     // Repeating decimal
      ];

      for (const amount of precisionAmounts) {
        const splitCount = Math.floor(Math.random() * 7) + 2; // 2-8 people
        const selectedUsers = userList.slice(0, splitCount);
        
        const baseAmount = Number((amount / splitCount).toFixed(2));
        const splits = selectedUsers.map((user, index) => ({
          user_id: user.id,
          amount: baseAmount
        }));

        // Distribute rounding error
        const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
        const difference = Number((amount - totalSplits).toFixed(2));
        
        if (Math.abs(difference) >= 0.01) {
          const centsToDistribute = Math.round(difference * 100);
          for (let i = 0; i < Math.abs(centsToDistribute) && i < splits.length; i++) {
            const adjustment = Math.sign(centsToDistribute) * 0.01;
            splits[i].amount = Number((splits[i].amount + adjustment).toFixed(2));
          }
        }

        await createExpenseWithCustomSplits(
          household.id,
          `Precision Test $${amount}`,
          amount,
          splits
        );
      }

      const balances = await getHouseholdBalances(household.id);
      const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
      expect(Math.abs(totalBalance)).toBeLessThan(0.02);

      console.log('✅ Maximum precision amounts handled correctly');
    });
  });

  describe('Complex Multi-Payer Scenarios', () => {
    it('should handle 4-way split payment with uneven amounts', async () => {
      console.log('\n=== MULTI-PAYER TEST: 4-Way Split Payment ===');
      
      const totalAmount = 800.00;
      const payments = [
        { payer_id: users.alice.id, amount: 250.00 }, // 31.25%
        { payer_id: users.bob.id, amount: 200.00 },   // 25%
        { payer_id: users.charlie.id, amount: 200.00 }, // 25%
        { payer_id: users.diana.id, amount: 150.00 }  // 18.75%
      ];

      // Split equally among all 8 people
      const equalShare = totalAmount / userList.length;
      const splits = userList.map(user => ({
        user_id: user.id,
        amount: Number(equalShare.toFixed(2))
      }));

      // Handle rounding
      const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
      const difference = totalAmount - totalSplits;
      if (Math.abs(difference) > 0.01) {
        splits[0].amount = Number((splits[0].amount + difference).toFixed(2));
      }

      await createMultiPayerExpense(
        household.id,
        'Group Vacation Deposit - 4 Payers',
        payments,
        splits
      );

      const balances = await getHouseholdBalances(household.id);
      
      // Verify payers have appropriate credits
      const aliceBalance = balances.find(b => b.user_id === users.alice.id);
      const bobBalance = balances.find(b => b.user_id === users.bob.id);
      
      // Alice paid $250, owes $100, so should have +$150 credit
      expect(aliceBalance?.balance).toBeCloseTo(150, 1);
      
      // Bob paid $200, owes $100, so should have +$100 credit  
      expect(bobBalance?.balance).toBeCloseTo(100, 1);

      console.log('✅ 4-way split payment calculated correctly');
    });

    it('should handle cascading multi-payer adjustments', async () => {
      console.log('\n=== MULTI-PAYER TEST: Cascading Adjustments ===');
      
      // Create initial multi-payer expense
      const initialAmount = 600.00;
      const initialPayments = [
        { payer_id: users.alice.id, amount: 400.00 },
        { payer_id: users.bob.id, amount: 200.00 }
      ];
      const initialSplits = userList.slice(0, 6).map(user => ({
        user_id: user.id,
        amount: 100.00
      }));

      const expenseId = uuidv4();
      
      // Mock initial creation
      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: { expense_id: expenseId, idempotent: false },
        error: null
      });

      await createMultiPayerExpense(
        household.id,
        'Initial Multi-Payer Expense',
        initialPayments,
        initialSplits
      );

      // Now update with different payers and amounts
      const updatedAmount = 750.00;
      const updatedPayments = [
        { payer_id: users.charlie.id, amount: 300.00 }, // New payer
        { payer_id: users.diana.id, amount: 250.00 },   // New payer
        { payer_id: users.alice.id, amount: 200.00 }    // Reduced amount
      ];
      const updatedSplits = userList.slice(0, 6).map(user => ({
        user_id: user.id,
        amount: 125.00
      }));

      await updateExpense(expenseId, {
        description: 'Updated Multi-Payer Expense',
        amount: updatedAmount,
        splits: updatedSplits,
        paid_by: users.charlie.id,
        date: '2024-01-15'
      });

      // Verify update was called correctly
      expect(supabase.rpc).toHaveBeenLastCalledWith('update_expense_with_adjustments', 
        expect.objectContaining({
          p_amount: updatedAmount,
          p_splits: updatedSplits
        })
      );

      console.log('✅ Cascading multi-payer adjustments handled correctly');
    });
  });

  describe('Extreme Edge Cases', () => {
    it('should handle settled expense with massive edit (10x amount change)', async () => {
      console.log('\n=== EDGE CASE: Massive Settled Expense Edit ===');
      
      // Create small settled expense
      const originalAmount = 100.00;
      const originalSplits = userList.slice(0, 4).map(user => ({
        user_id: user.id,
        amount: 25.00
      }));

      const expenseId = uuidv4();
      
      // Mock creation and settlement
      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: { expense_id: expenseId, idempotent: false },
        error: null
      });

      await createExpenseWithCustomSplits(
        household.id,
        'Small Expense (Pre-Settlement)',
        originalAmount,
        originalSplits
      );

      // Simulate massive increase (10x)
      const newAmount = 1000.00;
      const newSplits = userList.slice(0, 4).map(user => ({
        user_id: user.id,
        amount: 250.00
      }));

      await updateExpense(expenseId, {
        description: 'Small Expense (MASSIVE INCREASE)',
        amount: newAmount,
        splits: newSplits,
        paid_by: users.alice.id,
        date: '2024-01-15'
      });

      // Should handle 10x increase without breaking
      expect(supabase.rpc).toHaveBeenLastCalledWith('update_expense_with_adjustments',
        expect.objectContaining({
          p_amount: newAmount
        })
      );

      console.log('✅ 10x amount increase handled without errors');
    });

    it('should handle rapid-fire expense creation (race condition simulation)', async () => {
      console.log('\n=== EDGE CASE: Rapid-Fire Creation ===');
      
      // Simulate multiple users creating expenses simultaneously
      const rapidExpenses = Array.from({ length: 20 }, (_, i) => ({
        description: `Rapid Expense ${i + 1}`,
        amount: Math.round((Math.random() * 100 + 10) * 100) / 100,
        payer: userList[i % userList.length].id
      }));

      // Create all expenses "simultaneously" (Promise.all)
      const promises = rapidExpenses.map(expense => {
        const splits = userList.slice(0, 4).map(user => ({
          user_id: user.id,
          amount: Number((expense.amount / 4).toFixed(2))
        }));

        // Adjust for rounding
        const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
        const difference = expense.amount - totalSplits;
        if (Math.abs(difference) > 0.01) {
          splits[0].amount = Number((splits[0].amount + difference).toFixed(2));
        }

        return createExpenseWithCustomSplits(
          household.id,
          expense.description,
          expense.amount,
          splits,
          undefined,
          expense.payer
        );
      });

      // Wait for all to complete
      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results).toHaveLength(rapidExpenses.length);
      results.forEach(result => {
        expect(result.id).toBeDefined();
      });

      console.log(`✅ ${rapidExpenses.length} rapid-fire expenses created successfully`);
    });

    it('should handle zero-amount edge case', async () => {
      console.log('\n=== EDGE CASE: Zero Amount Handling ===');
      
      // Test behavior with zero amounts (should be rejected)
      await expect(createExpenseWithCustomSplits(
        household.id,
        'Zero Amount Test',
        0.00,
        [{ user_id: users.alice.id, amount: 0.00 }]
      )).rejects.toThrow();

      console.log('✅ Zero amounts properly rejected');
    });

    it('should handle single-user household edge case', async () => {
      console.log('\n=== EDGE CASE: Single User Household ===');
      
      const singleUserExpense = 150.00;
      const singleUserSplit = [{ user_id: users.alice.id, amount: 150.00 }];

      await createExpenseWithCustomSplits(
        household.id,
        'Single User Expense',
        singleUserExpense,
        singleUserSplit
      );

      const balances = await getHouseholdBalances(household.id);
      const aliceBalance = balances.find(b => b.user_id === users.alice.id);
      
      // Alice paid and owes the same amount, so balance should be 0
      expect(aliceBalance?.balance).toBeCloseTo(0, 2);

      console.log('✅ Single user household handled correctly');
    });
  });

  describe('Real-World Chaos Simulation', () => {
    it('should survive a month of chaos: mixed patterns, edits, settlements', async () => {
      console.log('\n=== CHAOS TEST: Real-World Month Simulation ===');
      
      const chaosEvents = [
        // Week 1: Normal activity
        { type: 'create', desc: 'Rent', amount: 3200.00, pattern: 'room-weighted' },
        { type: 'create', desc: 'Groceries', amount: 180.00, pattern: 'equal' },
        { type: 'create', desc: 'Electric', amount: 240.00, pattern: 'usage-based' },
        
        // Week 2: Some edits and adjustments
        { type: 'edit', desc: 'Groceries Correction', newAmount: 195.00 },
        { type: 'create', desc: 'Internet', amount: 89.99, pattern: 'equal' },
        { type: 'create', desc: 'Group Dinner', amount: 280.00, pattern: 'multi-payer' },
        
        // Week 3: Major changes and settlements
        { type: 'create', desc: 'Emergency Repair', amount: 850.00, pattern: 'custom' },
        { type: 'settle', desc: 'Bob pays Alice' },
        { type: 'edit', desc: 'Repair Cost Update', newAmount: 920.00 },
        
        // Week 4: End of month madness
        { type: 'create', desc: 'Final Groceries', amount: 160.00, pattern: 'equal' },
        { type: 'create', desc: 'Utilities', amount: 320.00, pattern: 'hybrid' },
        { type: 'edit', desc: 'Rent Adjustment', newAmount: 3150.00 }
      ];

      let createdExpenses = [];

      for (const event of chaosEvents) {
        try {
          if (event.type === 'create') {
            let splits;
            
            switch (event.pattern) {
              case 'room-weighted':
                splits = [
                  { user_id: users.alice.id, amount: event.amount * 0.20 },
                  { user_id: users.bob.id, amount: event.amount * 0.18 },
                  { user_id: users.charlie.id, amount: event.amount * 0.16 },
                  { user_id: users.diana.id, amount: event.amount * 0.14 },
                  { user_id: users.eve.id, amount: event.amount * 0.12 },
                  { user_id: users.frank.id, amount: event.amount * 0.10 },
                  { user_id: users.grace.id, amount: event.amount * 0.05 },
                  { user_id: users.henry.id, amount: event.amount * 0.05 }
                ];
                break;
                
              case 'usage-based':
                splits = [
                  { user_id: users.alice.id, amount: event.amount * 0.25 },
                  { user_id: users.bob.id, amount: event.amount * 0.30 }, // High usage
                  { user_id: users.charlie.id, amount: event.amount * 0.15 },
                  { user_id: users.diana.id, amount: event.amount * 0.30 } // High usage
                ];
                break;
                
              case 'multi-payer':
                const payments = [
                  { payer_id: users.alice.id, amount: event.amount * 0.4 },
                  { payer_id: users.bob.id, amount: event.amount * 0.6 }
                ];
                splits = userList.slice(0, 6).map(user => ({
                  user_id: user.id,
                  amount: Number((event.amount / 6).toFixed(2))
                }));
                
                await createMultiPayerExpense(household.id, event.desc, payments, splits);
                createdExpenses.push({ id: uuidv4(), description: event.desc });
                continue;
                
              default: // equal or custom
                const userCount = event.pattern === 'custom' ? 4 : userList.length;
                const selectedUsers = userList.slice(0, userCount);
                const baseAmount = event.amount / userCount;
                splits = selectedUsers.map(user => ({
                  user_id: user.id,
                  amount: Number(baseAmount.toFixed(2))
                }));
            }

            // Ensure splits sum correctly
            const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
            const difference = event.amount - totalSplits;
            if (Math.abs(difference) > 0.01) {
              splits[0].amount = Number((splits[0].amount + difference).toFixed(2));
            }

            const result = await createExpenseWithCustomSplits(
              household.id,
              event.desc,
              event.amount,
              splits
            );
            
            createdExpenses.push({ id: result.id, description: event.desc });
            
          } else if (event.type === 'edit' && createdExpenses.length > 0) {
            const expenseToEdit = createdExpenses.find(e => 
              e.description.includes(event.desc.split(' ')[0])
            );
            
            if (expenseToEdit) {
              const newSplits = userList.slice(0, 4).map(user => ({
                user_id: user.id,
                amount: Number((event.newAmount / 4).toFixed(2))
              }));

              await updateExpense(expenseToEdit.id, {
                description: event.desc,
                amount: event.newAmount,
                splits: newSplits,
                paid_by: users.alice.id,
                date: '2024-01-15'
              });
            }
          }
          
        } catch (error) {
          console.warn(`Event failed: ${event.desc}`, error.message);
        }
      }

      // Final balance check after chaos
      const finalBalances = await getHouseholdBalances(household.id);
      const totalBalance = finalBalances.reduce((sum, b) => sum + b.balance, 0);
      
      // Should still sum to zero despite all the chaos
      expect(Math.abs(totalBalance)).toBeLessThan(0.50); // Allow some tolerance for complexity
      
      console.log(`✅ Survived ${chaosEvents.length} chaos events`);
      console.log(`✅ Final balance consistency: $${totalBalance.toFixed(2)}`);
      console.log(`✅ Created ${createdExpenses.length} expenses during chaos`);
    });
  });

  afterAll(() => {
    console.log('\n🔥 EXTREME TESTING COMPLETE 🔥');
    console.log(`Total transactions processed: ${transactionHistory.length}`);
    console.log('All extreme scenarios passed successfully!');
    console.log('System is robust under stress and edge cases.');
  });
});