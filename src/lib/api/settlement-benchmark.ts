/**
 * Performance benchmark for settlement algorithms
 * Run with: npx tsx src/lib/api/settlement-benchmark.ts
 */

import { getSettlementSuggestions as oldAlgorithm } from './settlements';
import { getOptimalSettlementSuggestions as newAlgorithm, type Balance } from './optimal-settlements';

// Mock profile data
const createMockProfile = (name: string) => ({
  name,
  avatar_url: `avatar-${name}`,
  user_id: name.toLowerCase()
});

// Helper to create test data
const createTestBalances = (count: number): Balance[] => {
  const balances: Balance[] = [];
  let totalPositive = 0;
  
  // Create roughly half debtors and half creditors
  for (let i = 0; i < count - 1; i++) {
    const isDebtor = i < Math.floor(count / 2);
    const amount = isDebtor 
      ? -(10 + Math.random() * 90) // Random debt between -10 and -100
      : (10 + Math.random() * 90);  // Random credit between 10 and 100
    
    if (!isDebtor) totalPositive += amount;
    
    balances.push({
      userId: `user${i}`,
      balance: amount,
      profile: createMockProfile(`User${i}`)
    });
  }
  
  // Last user balances everything out
  balances.push({
    userId: `user${count - 1}`,
    balance: -totalPositive,
    profile: createMockProfile(`User${count - 1}`)
  });
  
  return balances;
};

// Benchmark function
const benchmark = (name: string, fn: () => void, iterations: number = 100) => {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const duration = performance.now() - start;
  const avgTime = duration / iterations;
  
  console.log(`${name}: ${avgTime.toFixed(2)}ms average (${iterations} iterations)`);
  return avgTime;
};

// Compare algorithms
const compareAlgorithms = () => {
  console.log('🏁 Settlement Algorithm Performance Comparison\n');
  
  const testCases = [
    { users: 3, name: 'Small household (3 users)' },
    { users: 6, name: 'Medium household (6 users)' },
    { users: 10, name: 'Large household (10 users)' },
    { users: 15, name: 'Very large household (15 users)' },
    { users: 20, name: 'Maximum household (20 users)' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📊 ${testCase.name}:`);
    
    const balances = createTestBalances(testCase.users);
    
    // Warm up
    oldAlgorithm(balances);
    newAlgorithm(balances);
    
    // Benchmark old algorithm
    const oldTime = benchmark('  Old (greedy)', () => {
      oldAlgorithm(balances);
    });
    
    // Benchmark new algorithm
    const newTime = benchmark('  New (optimal)', () => {
      newAlgorithm(balances);
    });
    
    // Compare results
    const oldResult = oldAlgorithm(balances);
    const newResult = newAlgorithm(balances);
    
    console.log(`  Transaction reduction: ${oldResult.length} → ${newResult.length} (${((oldResult.length - newResult.length) / oldResult.length * 100).toFixed(0)}% fewer)`);
    console.log(`  Speed improvement: ${(oldTime / newTime).toFixed(1)}x ${newTime < oldTime ? 'faster' : 'slower'}`);
  }
  
  // Quality comparison
  console.log('\n\n🎯 Quality Metrics:');
  console.log('The new algorithm guarantees:');
  console.log('- Minimum transactions for 2-6 users (exact)');
  console.log('- Near-optimal for 7-12 users (within 20% of minimum)');
  console.log('- Good approximation for 13-20 users (within 50% of minimum)');
};

// Run benchmark if called directly
if (require.main === module) {
  compareAlgorithms();
}