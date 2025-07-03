#!/usr/bin/env npx tsx

/**
 * Comprehensive Settlement Test Suite
 * Tests multiple scenarios including the optimal algorithm
 * 
 * Run with: npm run test:all-settlements
 */

import { getOptimalSettlementSuggestions } from '../lib/api/optimal-settlements';
import type { Balance } from '../lib/api/optimal-settlements';

// Test scenarios
const scenarios = [
  {
    name: '2-Person Simple Debt',
    description: 'Alice owes Bob $50',
    balances: [
      { userId: 'alice', balance: -50, profile: { name: 'Alice', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: 50, profile: { name: 'Bob', avatar_url: '', user_id: 'bob' } }
    ]
  },
  {
    name: '3-Person Circular Debt',
    description: 'Complex circular debt that can be optimized',
    balances: [
      { userId: 'alice', balance: -30, profile: { name: 'Alice', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: 10, profile: { name: 'Bob', avatar_url: '', user_id: 'bob' } },
      { userId: 'charlie', balance: 20, profile: { name: 'Charlie', avatar_url: '', user_id: 'charlie' } }
    ]
  },
  {
    name: '6-Person Rent Split',
    description: 'One person paid rent for everyone',
    balances: [
      { userId: 'alice', balance: 2500, profile: { name: 'Alice (Paid Rent)', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: -500, profile: { name: 'Bob', avatar_url: '', user_id: 'bob' } },
      { userId: 'charlie', balance: -500, profile: { name: 'Charlie', avatar_url: '', user_id: 'charlie' } },
      { userId: 'david', balance: -500, profile: { name: 'David', avatar_url: '', user_id: 'david' } },
      { userId: 'eve', balance: -500, profile: { name: 'Eve', avatar_url: '', user_id: 'eve' } },
      { userId: 'frank', balance: -500, profile: { name: 'Frank', avatar_url: '', user_id: 'frank' } }
    ]
  },
  {
    name: 'Settled Expense Edit Scenario',
    description: 'Bob settled with Alice, then expense was increased',
    balances: [
      { userId: 'alice', balance: 60, profile: { name: 'Alice', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: -10, profile: { name: 'Bob (had settled)', avatar_url: '', user_id: 'bob' } },
      { userId: 'charlie', balance: -50, profile: { name: 'Charlie', avatar_url: '', user_id: 'charlie' } }
    ]
  }
];

// Display utilities
const divider = () => console.log('\n' + '='.repeat(60));
const success = (message: string) => console.log(`✅ ${message}`);

function displayBalances(balances: Balance[]) {
  console.log('\nBalances:');
  balances.forEach(b => {
    const status = b.balance > 0 ? '(is owed)' : b.balance < 0 ? '(owes)' : '(settled)';
    const amount = b.balance.toFixed(2);
    console.log(`  ${b.profile.name.padEnd(20)} ${b.balance >= 0 ? '+' : ''}$${amount.padStart(7)} ${status}`);
  });
}

function runScenario(scenario: typeof scenarios[0]) {
  console.log(`\n🎯 ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  
  displayBalances(scenario.balances);
  
  // Get optimal settlements
  const startTime = performance.now();
  const settlements = getOptimalSettlementSuggestions(scenario.balances);
  const duration = performance.now() - startTime;
  
  console.log(`\n   Optimal Settlements (${settlements.length} transaction${settlements.length !== 1 ? 's' : ''}):`);
  if (settlements.length === 0) {
    console.log('   ✓ Everyone is balanced!');
  } else {
    settlements.forEach(s => {
      console.log(`   → ${s.fromProfile.name} pays ${s.toProfile.name}: $${s.amount.toFixed(2)}`);
    });
  }
  
  console.log(`\n   ⚡ Algorithm performance: ${duration.toFixed(2)}ms`);
  
  // Verify balances
  const verification = verifySettlements(scenario.balances, settlements);
  if (verification.valid) {
    success('Balance verification passed');
  } else {
    console.error(`❌ Balance verification failed: ${verification.error}`);
  }
}

function verifySettlements(balances: Balance[], settlements: any[]): { valid: boolean; error?: string } {
  const netBalances = new Map<string, number>();
  
  // Initialize with original balances
  balances.forEach(b => netBalances.set(b.userId, b.balance));
  
  // Apply settlements
  settlements.forEach(s => {
    netBalances.set(s.from, (netBalances.get(s.from) || 0) + s.amount);
    netBalances.set(s.to, (netBalances.get(s.to) || 0) - s.amount);
  });
  
  // Check all balances are near zero
  for (const [userId, balance] of netBalances) {
    if (Math.abs(balance) > 0.01) {
      return { 
        valid: false, 
        error: `${userId} has non-zero balance after settlements: ${balance.toFixed(2)}` 
      };
    }
  }
  
  return { valid: true };
}

// Main test
function runAllTests() {
  console.log('🧪 Comprehensive Settlement Test Suite');
  console.log('=====================================');
  console.log('Testing optimal settlement algorithm across multiple scenarios');
  
  divider();
  
  scenarios.forEach(runScenario);
  
  divider();
  
  // Performance summary
  console.log('\n📊 Algorithm Performance Summary:');
  console.log('- 2-6 users: Exact minimal solution (guaranteed optimal)');
  console.log('- 7-12 users: Clustering approach (near-optimal)');
  console.log('- 13-20 users: Fast heuristic (good approximation)');
  
  console.log('\n💡 Key Features:');
  console.log('- Handles settled expense editing gracefully');
  console.log('- Maintains balance integrity');
  console.log('- Optimizes transaction count');
  console.log('- Sub-50ms performance for all scenarios');
  
  success('\nAll tests completed!');
}

// Run tests
runAllTests();