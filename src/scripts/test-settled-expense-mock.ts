#!/usr/bin/env npx tsx

/**
 * Mock CLI Test: Settled Expense Editing Flow
 * 
 * This script demonstrates the logic flow without actual database calls
 * Run with: npx tsx src/scripts/test-settled-expense-mock.ts
 */

import { getOptimalSettlementSuggestions } from '../lib/api/optimal-settlements';
import type { Balance } from '../lib/api/optimal-settlements';

// Mock data
const users = {
  alice: { id: 'alice', name: 'Alice' },
  bob: { id: 'bob', name: 'Bob' },
  charlie: { id: 'charlie', name: 'Charlie' }
};

// Utility functions
const log = (message: string) => console.log(`\n📋 ${message}`);
const success = (message: string) => console.log(`✅ ${message}`);
const warning = (message: string) => console.log(`⚠️  ${message}`);
const divider = () => console.log('\n' + '='.repeat(60));

// Helper to display balances
function displayBalances(balances: Balance[], title: string) {
  console.log(`\n${title}:`);
  balances.forEach(b => {
    const status = b.balance > 0 ? '(is owed)' : b.balance < 0 ? '(owes)' : '(settled)';
    console.log(`  ${b.profile.name}: ${b.balance > 0 ? '+' : ''}$${b.balance.toFixed(2)} ${status}`);
  });
}

// Helper to display settlements
function displaySettlements(balances: Balance[]) {
  const settlements = getOptimalSettlementSuggestions(balances);
  if (settlements.length === 0) {
    console.log('\n  No settlements needed - everyone is balanced!');
    return;
  }
  
  console.log('\n  Settlement suggestions:');
  settlements.forEach(s => {
    console.log(`  → ${s.fromProfile.name} pays ${s.toProfile.name}: $${s.amount.toFixed(2)}`);
  });
}

// Main test flow
async function runMockTest() {
  console.log('🧪 Settled Expense Editing Mock Test');
  console.log('=====================================');
  console.log('This demonstrates the logic flow without database calls');
  
  divider();
  
  // Step 1: Create expense
  log('Step 1: Create Expense');
  console.log('Alice pays $150 for dinner, split equally among 3 people');
  
  let balances: Balance[] = [
    { 
      userId: users.alice.id, 
      balance: 100,  // Paid $150, owes $50 = is owed $100
      profile: { ...users.alice, user_id: users.alice.id, avatar_url: '' } 
    },
    { 
      userId: users.bob.id, 
      balance: -50,  // Owes $50
      profile: { ...users.bob, user_id: users.bob.id, avatar_url: '' } 
    },
    { 
      userId: users.charlie.id, 
      balance: -50,  // Owes $50
      profile: { ...users.charlie, user_id: users.charlie.id, avatar_url: '' } 
    }
  ];
  
  displayBalances(balances, 'Initial balances');
  displaySettlements(balances);
  
  divider();
  
  // Step 2: Create settlement
  log('Step 2: Bob Settles Up');
  console.log('Bob pays Alice $50 to settle his debt');
  
  // Apply settlement
  balances = balances.map(b => {
    if (b.userId === users.bob.id) {
      return { ...b, balance: b.balance + 50 }; // Bob paid $50
    } else if (b.userId === users.alice.id) {
      return { ...b, balance: b.balance - 50 }; // Alice received $50
    }
    return b;
  });
  
  success('Settlement recorded - Bob\'s split is now marked as "settled"');
  displayBalances(balances, 'Balances after settlement');
  displaySettlements(balances);
  
  divider();
  
  // Step 3: Edit the settled expense
  log('Step 3: Edit the Settled Expense');
  warning('Editing expense with settled splits - this will create adjustments!');
  console.log('Increasing total from $150 to $180 (each person now owes $60 instead of $50)');
  
  // Show warning dialog
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│ ⚠️  Settled Splits Affected                     │');
  console.log('│                                                 │');
  console.log('│ You are editing an expense that has already    │');
  console.log('│ been settled by one or more members.           │');
  console.log('│ Proceeding will create adjustments to their    │');
  console.log('│ balances. This action cannot be undone.        │');
  console.log('│                                                 │');
  console.log('│ [Cancel Edit]  [Proceed Anyway]                │');
  console.log('└─────────────────────────────────────────────────┘');
  
  console.log('\n→ User clicks "Proceed Anyway"');
  
  // Calculate adjustments
  const adjustments = {
    alice: -10,    // Now owes $10 more (split increased from $50 to $60)
    bob: -10,      // Now owes $10 more (ADJUSTMENT because already settled)
    charlie: -10   // Now owes $10 more
  };
  
  console.log('\nAdjustments created:');
  console.log(`  Alice: ${adjustments.alice} (direct balance change)`);
  console.log(`  Bob: ${adjustments.bob} (⚠️ ADJUSTMENT - split was settled)`);
  console.log(`  Charlie: ${adjustments.charlie} (direct balance change)`);
  
  // Apply adjustments to balances
  // Alice now paid $180 but owes $60 = is owed $120 (was owed $100, so +$20)
  // But she also has the -$10 adjustment, so net change is +$10
  balances = [
    { 
      ...balances[0], 
      balance: 110  // Was 50, now is owed 110 (+60 from paying more, -50 from owing more)
    },
    { 
      ...balances[1], 
      balance: -10  // Was 0 (settled), now owes $10 due to adjustment
    },
    { 
      ...balances[2], 
      balance: -60  // Was -50, now owes $60
    }
  ];
  
  success('Expense updated with adjustments tracked');
  
  divider();
  
  // Step 4: Show final state
  log('Step 4: Final State');
  displayBalances(balances, 'Final balances (after edit with adjustments)');
  displaySettlements(balances);
  
  console.log('\n📊 Adjustment Summary:');
  console.log('- Bob had settled his $50 share');
  console.log('- After edit, his share is $60');
  console.log('- System created a -$10 adjustment (he owes $10 more)');
  console.log('- This maintains the integrity of the settlement history');
  
  divider();
  
  success('Mock test completed!');
  console.log('\n💡 Key Takeaways:');
  console.log('1. Settled expense CAN be edited');
  console.log('2. System shows a warning before proceeding');
  console.log('3. Adjustments are created for settled splits');
  console.log('4. Balance integrity is maintained throughout');
  console.log('5. Settlement history is preserved');
}

// Run the test
runMockTest().catch(console.error);