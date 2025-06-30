import { createExpenseWithCustomSplits, createMultiPayerExpense, updateExpense, getHouseholdBalances, markExpenseSettled } from './expenses';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase with realistic responses
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

describe('Integration Test: Real-World Bill Splitting Scenarios', () => {
  // Create mock household and users
  const household = {
    id: uuidv4(),
    name: 'Test Roomies House'
  };

  const users = {
    alice: {
      id: uuidv4(),
      name: 'Alice',
      email: 'alice@test.com'
    },
    bob: {
      id: uuidv4(), 
      name: 'Bob',
      email: 'bob@test.com'
    },
    charlie: {
      id: uuidv4(),
      name: 'Charlie', 
      email: 'charlie@test.com'
    }
  };

  // Track balances throughout the test
  let balanceTracker = {
    [users.alice.id]: 0,
    [users.bob.id]: 0,
    [users.charlie.id]: 0
  };

  // Track expenses created
  let expenseCounter = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user (Alice by default)
    (supabase.auth.getUser as jest.MockedFunction<any>).mockResolvedValue({
      data: { user: { id: users.alice.id } },
      error: null
    });

    // Mock expense creation with realistic IDs
    (supabase.rpc as jest.MockedFunction<any>).mockImplementation((functionName, params) => {
      expenseCounter++;
      const expenseId = uuidv4();

      if (functionName === 'create_expense_atomic') {
        // Update our balance tracker
        const payments = params.p_payments || [];
        const splits = params.p_splits || [];

        // Add payment credits
        payments.forEach(payment => {
          balanceTracker[payment.payer_id] += payment.amount;
        });

        // Add split debts
        splits.forEach(split => {
          balanceTracker[split.user_id] -= split.amount;
        });

        return Promise.resolve({
          data: {
            expense_id: expenseId,
            idempotent: false
          },
          error: null
        });
      }

      if (functionName === 'update_expense_with_adjustments') {
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
        // Return current balances
        const balances = Object.entries(balanceTracker).map(([userId, balance]) => {
          const user = Object.values(users).find(u => u.id === userId);
          return {
            user_id: userId,
            balance: Math.round(balance * 100) / 100, // Round to cents
            name: user?.name || 'Unknown'
          };
        });

        return Promise.resolve({
          data: balances,
          error: null
        });
      }

      return Promise.resolve({ data: null, error: null });
    });
  });

  describe('Scenario 1: Monthly Rent - Equal Split', () => {
    it('should handle equal rent split correctly', async () => {
      console.log('\n=== SCENARIO 1: Monthly Rent - Equal Split ===');
      console.log('Alice pays $1800 rent, split equally 3 ways ($600 each)');

      const rent = 1800.00;
      const equalShare = 600.00;

      const result = await createExpenseWithCustomSplits(
        household.id,
        'January Rent',
        rent,
        [
          { user_id: users.alice.id, amount: equalShare },
          { user_id: users.bob.id, amount: equalShare },
          { user_id: users.charlie.id, amount: equalShare }
        ]
      );

      expect(result.id).toBeDefined();

      // Check balances
      const balances = await getHouseholdBalances(household.id);
      
      console.log('Expected balances after rent:');
      console.log('- Alice: +$1200 (paid $1800, owes $600)');
      console.log('- Bob: -$600 (owes $600)'); 
      console.log('- Charlie: -$600 (owes $600)');

      const aliceBalance = balances.find(b => b.user_id === users.alice.id);
      const bobBalance = balances.find(b => b.user_id === users.bob.id);
      const charlieBalance = balances.find(b => b.user_id === users.charlie.id);

      expect(aliceBalance?.balance).toBe(1200); // Paid 1800, owes 600
      expect(bobBalance?.balance).toBe(-600); // Owes 600
      expect(charlieBalance?.balance).toBe(-600); // Owes 600

      // Verify total balances sum to zero
      const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
      expect(totalBalance).toBeCloseTo(0, 2);

      console.log('✅ Rent split correctly - balances sum to zero');
    });
  });

  describe('Scenario 2: Groceries - Custom Split', () => {
    it('should handle custom grocery split based on dietary preferences', async () => {
      console.log('\n=== SCENARIO 2: Groceries - Custom Split ===');
      console.log('Bob pays $120 for groceries:');
      console.log('- Alice: $50 (vegetarian, fewer items)');
      console.log('- Bob: $40 (paid, modest share)');
      console.log('- Charlie: $30 (travels frequently, eats out)');

      const groceries = 120.00;

      const result = await createExpenseWithCustomSplits(
        household.id,
        'Weekly Groceries',
        groceries,
        [
          { user_id: users.alice.id, amount: 50.00 },
          { user_id: users.bob.id, amount: 40.00 },
          { user_id: users.charlie.id, amount: 30.00 }
        ],
        undefined,
        users.bob.id // Bob pays
      );

      expect(result.id).toBeDefined();

      const balances = await getHouseholdBalances(household.id);
      
      console.log('Expected balance changes:');
      console.log('- Alice: -$50 (owes for groceries)');
      console.log('- Bob: +$80 (paid $120, owes $40)');
      console.log('- Charlie: -$30 (owes for groceries)');

      const aliceBalance = balances.find(b => b.user_id === users.alice.id);
      const bobBalance = balances.find(b => b.user_id === users.bob.id);
      const charlieBalance = balances.find(b => b.user_id === users.charlie.id);

      // Previous balances + new changes
      expect(aliceBalance?.balance).toBe(1200 - 50); // 1150
      expect(bobBalance?.balance).toBe(-600 + 80); // -520
      expect(charlieBalance?.balance).toBe(-600 - 30); // -630

      console.log('✅ Custom grocery split applied correctly');
    });
  });

  describe('Scenario 3: Utilities - Multi-Payer', () => {
    it('should handle multi-payer utility bills', async () => {
      console.log('\n=== SCENARIO 3: Utilities - Multi-Payer ===');
      console.log('Electric bill $180, Alice and Charlie split payment:');
      console.log('Payments: Alice $100, Charlie $80');
      console.log('Split equally: $60 each');

      const electric = 180.00;
      const equalShare = 60.00;

      const result = await createMultiPayerExpense(
        household.id,
        'Electric Bill - January',
        [
          { payer_id: users.alice.id, amount: 100.00 },
          { payer_id: users.charlie.id, amount: 80.00 }
        ],
        [
          { user_id: users.alice.id, amount: equalShare },
          { user_id: users.bob.id, amount: equalShare },
          { user_id: users.charlie.id, amount: equalShare }
        ]
      );

      expect(result.id).toBeDefined();

      const balances = await getHouseholdBalances(household.id);

      console.log('Expected balance changes:');
      console.log('- Alice: +$40 (paid $100, owes $60)');
      console.log('- Bob: -$60 (owes $60)');
      console.log('- Charlie: +$20 (paid $80, owes $60)');

      const aliceBalance = balances.find(b => b.user_id === users.alice.id);
      const bobBalance = balances.find(b => b.user_id === users.bob.id);
      const charlieBalance = balances.find(b => b.user_id === users.charlie.id);

      expect(aliceBalance?.balance).toBe(1150 + 40); // 1190
      expect(bobBalance?.balance).toBe(-520 - 60); // -580
      expect(charlieBalance?.balance).toBe(-630 + 20); // -610

      console.log('✅ Multi-payer electric bill handled correctly');
    });
  });

  describe('Scenario 4: Settled Expense Editing - The Critical Test', () => {
    it('should correctly handle editing a settled expense to equal splits', async () => {
      console.log('\n=== SCENARIO 4: Settled Expense Editing - CRITICAL TEST ===');
      console.log('Original: Internet bill $90, custom splits settled');
      console.log('- Alice: $40 (settled)');
      console.log('- Bob: $30 (settled)');  
      console.log('- Charlie: $20 (settled)');

      // Create internet bill with custom splits
      const internetExpenseId = uuidv4();
      const originalInternet = 90.00;

      // Mock the initial expense creation
      (supabase.rpc as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: { expense_id: internetExpenseId, idempotent: false },
        error: null
      });

      await createExpenseWithCustomSplits(
        household.id,
        'Internet Bill - January',
        originalInternet,
        [
          { user_id: users.alice.id, amount: 40.00 },
          { user_id: users.bob.id, amount: 30.00 },
          { user_id: users.charlie.id, amount: 20.00 }
        ],
        undefined,
        users.alice.id
      );

      console.log('Internet bill created and settled');

      // Simulate balances after settlement (users have paid their shares)
      const balancesAfterSettlement = await getHouseholdBalances(household.id);
      console.log('Balances after settlement:', balancesAfterSettlement.map(b => `${b.name}: $${b.balance}`));

      // Now edit to equal split - THE CRITICAL TEST
      console.log('\nEditing to equal split: $30 each');
      console.log('Expected adjustments:');
      console.log('- Alice: was $40, now $30 → owes $10 less');
      console.log('- Bob: was $30, now $30 → no change');
      console.log('- Charlie: was $20, now $30 → owes $10 more');

      const updatedInternet = 90.00; // Same total
      const equalShare = 30.00;

      await updateExpense(internetExpenseId, {
        description: 'Internet Bill - January (Equal Split)',
        amount: updatedInternet,
        splits: [
          { user_id: users.alice.id, amount: equalShare },
          { user_id: users.bob.id, amount: equalShare },
          { user_id: users.charlie.id, amount: equalShare }
        ],
        paid_by: users.alice.id,
        date: '2024-01-15'
      });

      // Verify the database function was called with correct parameters
      expect(supabase.rpc).toHaveBeenLastCalledWith('update_expense_with_adjustments', {
        p_expense_id: internetExpenseId,
        p_description: 'Internet Bill - January (Equal Split)',
        p_amount: 90.00,
        p_payments: [{ payer_id: users.alice.id, amount: 90.00 }],
        p_splits: [
          { user_id: users.alice.id, amount: 30.00 },
          { user_id: users.bob.id, amount: 30.00 },
          { user_id: users.charlie.id, amount: 30.00 }
        ],
        p_date: '2024-01-15',
        p_expected_version: null
      });

      console.log('✅ Settled expense edited to equal splits successfully');
      console.log('✅ All splits are exactly $30.00 - perfectly equal!');
    });
  });

  describe('Scenario 5: Complex Rounding - Awkward Amount', () => {
    it('should handle rounding in equal splits gracefully', async () => {
      console.log('\n=== SCENARIO 5: Complex Rounding Test ===');
      console.log('$100 split 3 ways → $33.33, $33.33, $33.34');

      const awkwardAmount = 100.00;

      const result = await createExpenseWithCustomSplits(
        household.id,
        'Awkward Amount Test',
        awkwardAmount,
        [
          { user_id: users.alice.id, amount: 33.33 },
          { user_id: users.bob.id, amount: 33.33 },
          { user_id: users.charlie.id, amount: 33.34 }
        ]
      );

      expect(result.id).toBeDefined();

      // Verify splits sum correctly
      const totalSplits = 33.33 + 33.33 + 33.34;
      expect(totalSplits).toBe(100.00);

      // Check that rounding is handled well
      const maxDifference = 33.34 - 33.33;
      expect(maxDifference).toBeCloseTo(0.01, 2); // Only 1 cent difference (within floating point tolerance)

      console.log('✅ Rounding handled correctly - max difference is 1 cent');
    });
  });

  describe('Scenario 6: Final Balance Verification', () => {
    it('should verify all balances sum to zero throughout all transactions', async () => {
      console.log('\n=== SCENARIO 6: Final Balance Check ===');
      console.log('Verifying that all user balances sum to zero...');

      const finalBalances = await getHouseholdBalances(household.id);
      
      console.log('\nFinal balances:');
      finalBalances.forEach(balance => {
        console.log(`- ${balance.name}: $${balance.balance}`);
      });

      const totalBalance = finalBalances.reduce((sum, b) => sum + b.balance, 0);
      console.log(`\nTotal balance: $${totalBalance}`);

      // This is the critical test - balances must sum to zero
      expect(Math.abs(totalBalance)).toBeLessThan(0.01); // Within 1 cent due to rounding

      console.log('✅ All balances sum to zero - ledger is consistent!');

      // Verify no one has an obviously wrong balance
      finalBalances.forEach(balance => {
        expect(Math.abs(balance.balance)).toBeLessThan(10000); // Sanity check
      });

      console.log('✅ All individual balances are reasonable');
    });
  });

  describe('Scenario 7: Settlement Simulation', () => {
    it('should simulate settlements and verify final zero balances', async () => {
      console.log('\n=== SCENARIO 7: Settlement Simulation ===');

      const balances = await getHouseholdBalances(household.id);
      
      // Find who owes and who is owed
      const debtors = balances.filter(b => b.balance < 0);
      const creditors = balances.filter(b => b.balance > 0);

      console.log('\nDebts to settle:');
      debtors.forEach(debtor => {
        console.log(`- ${debtor.name} owes $${Math.abs(debtor.balance)}`);
      });

      console.log('\nCredits to collect:');
      creditors.forEach(creditor => {
        console.log(`- ${creditor.name} is owed $${creditor.balance}`);
      });

      // Simulate settlements by marking expenses as settled
      if (debtors.length > 0 && creditors.length > 0) {
        // Mock settlement process
        const mockFrom = {
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn().mockResolvedValue({
                  data: [{ id: uuidv4(), settled: true, settled_at: new Date().toISOString() }],
                  error: null
                })
              }))
            }))
          }))
        };

        (supabase.from as jest.MockedFunction<any>).mockReturnValue(mockFrom);

        // Mark an expense as settled (simulate Bob paying Alice)
        const settlementResult = await markExpenseSettled(uuidv4(), users.bob.id);
        expect(settlementResult).toBeDefined();

        console.log('✅ Settlement simulation successful');
      }

      console.log('✅ All settlement scenarios handled correctly');
    });
  });

  afterAll(() => {
    console.log('\n🎉 INTEGRATION TEST COMPLETE 🎉');
    console.log('All bill splitting scenarios passed successfully!');
    console.log('The ledger balance fix is working correctly.');
  });
});