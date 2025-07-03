"use client";

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle, BarChart3, Users, ArrowRight } from 'lucide-react';
import { getOptimalSettlementSuggestions } from '@/lib/api/optimal-settlements';
import type { Balance, Settlement } from '@/lib/api/optimal-settlements';
import { Button } from '@/components/primitives/Button';

// Comprehensive test cases
const generateTestCases = () => {
  const testCases = [];
  
  // 1. Simple 2-person tests
  testCases.push({
    id: 'simple-2-equal',
    name: 'Simple 2-Person Equal Debt',
    participants: 2,
    balances: [
      { userId: 'A', balance: -50, profile: { name: 'Alice', avatar_url: '', user_id: 'A' } },
      { userId: 'B', balance: 50, profile: { name: 'Bob', avatar_url: '', user_id: 'B' } }
    ],
    expectedTransactions: 1,
    description: 'Basic case: A owes B exactly $50'
  });
  
  // 2. Perfect triangle
  testCases.push({
    id: 'triangle-3',
    name: '3-Person Perfect Triangle',
    participants: 3,
    balances: [
      { userId: 'A', balance: -60, profile: { name: 'Alice', avatar_url: '', user_id: 'A' } },
      { userId: 'B', balance: -30, profile: { name: 'Bob', avatar_url: '', user_id: 'B' } },
      { userId: 'C', balance: 90, profile: { name: 'Charlie', avatar_url: '', user_id: 'C' } }
    ],
    expectedTransactions: 2,
    description: 'A and B both owe C'
  });
  
  // 3. Circular debt that can be optimized
  testCases.push({
    id: 'circular-4',
    name: '4-Person Circular Debt',
    participants: 4,
    balances: [
      { userId: 'A', balance: -40, profile: { name: 'Alice', avatar_url: '', user_id: 'A' } },
      { userId: 'B', balance: 20, profile: { name: 'Bob', avatar_url: '', user_id: 'B' } },
      { userId: 'C', balance: -30, profile: { name: 'Charlie', avatar_url: '', user_id: 'C' } },
      { userId: 'D', balance: 50, profile: { name: 'David', avatar_url: '', user_id: 'D' } }
    ],
    expectedTransactions: 3,
    description: 'Complex circular debt pattern'
  });
  
  // 4. One person paid for everyone (common scenario)
  testCases.push({
    id: 'one-payer-5',
    name: '5-Person Single Payer',
    participants: 5,
    balances: [
      { userId: 'A', balance: 200, profile: { name: 'Alice (Paid)', avatar_url: '', user_id: 'A' } },
      { userId: 'B', balance: -50, profile: { name: 'Bob', avatar_url: '', user_id: 'B' } },
      { userId: 'C', balance: -50, profile: { name: 'Charlie', avatar_url: '', user_id: 'C' } },
      { userId: 'D', balance: -50, profile: { name: 'David', avatar_url: '', user_id: 'D' } },
      { userId: 'E', balance: -50, profile: { name: 'Eve', avatar_url: '', user_id: 'E' } }
    ],
    expectedTransactions: 4,
    description: 'Alice paid $250 total, others owe $50 each'
  });
  
  // 5. Mixed positive and negative balances
  testCases.push({
    id: 'mixed-6',
    name: '6-Person Mixed Balances',
    participants: 6,
    balances: [
      { userId: 'A', balance: 120, profile: { name: 'Alice', avatar_url: '', user_id: 'A' } },
      { userId: 'B', balance: -45, profile: { name: 'Bob', avatar_url: '', user_id: 'B' } },
      { userId: 'C', balance: 80, profile: { name: 'Charlie', avatar_url: '', user_id: 'C' } },
      { userId: 'D', balance: -55, profile: { name: 'David', avatar_url: '', user_id: 'D' } },
      { userId: 'E', balance: -40, profile: { name: 'Eve', avatar_url: '', user_id: 'E' } },
      { userId: 'F', balance: -60, profile: { name: 'Frank', avatar_url: '', user_id: 'F' } }
    ],
    expectedTransactions: 4,
    description: 'Multiple payers and debtors'
  });
  
  // 6. Large group test
  testCases.push({
    id: 'large-10',
    name: '10-Person Group Event',
    participants: 10,
    balances: generateLargeGroupBalances(10),
    expectedTransactions: 9,
    description: 'Large group with varied contributions'
  });
  
  // 7. Stress test
  testCases.push({
    id: 'stress-20',
    name: '20-Person Stress Test',
    participants: 20,
    balances: generateLargeGroupBalances(20),
    expectedTransactions: 19,
    description: 'Maximum supported group size'
  });
  
  // 8. Floating point precision test
  testCases.push({
    id: 'precision-3',
    name: 'Floating Point Precision',
    participants: 3,
    balances: [
      { userId: 'A', balance: -33.33, profile: { name: 'Alice', avatar_url: '', user_id: 'A' } },
      { userId: 'B', balance: -33.33, profile: { name: 'Bob', avatar_url: '', user_id: 'B' } },
      { userId: 'C', balance: 66.66, profile: { name: 'Charlie', avatar_url: '', user_id: 'C' } }
    ],
    expectedTransactions: 2,
    description: 'Tests rounding and precision handling'
  });
  
  // 9. Zero balance edge case
  testCases.push({
    id: 'zero-balance',
    name: 'Zero Balance Participants',
    participants: 4,
    balances: [
      { userId: 'A', balance: -50, profile: { name: 'Alice', avatar_url: '', user_id: 'A' } },
      { userId: 'B', balance: 0, profile: { name: 'Bob', avatar_url: '', user_id: 'B' } },
      { userId: 'C', balance: 0, profile: { name: 'Charlie', avatar_url: '', user_id: 'C' } },
      { userId: 'D', balance: 50, profile: { name: 'David', avatar_url: '', user_id: 'D' } }
    ],
    expectedTransactions: 1,
    description: 'Some participants have zero balance'
  });
  
  return testCases;
};

// Helper to generate large group balances
function generateLargeGroupBalances(count: number): Balance[] {
  const balances: Balance[] = [];
  let totalPositive = 0;
  
  // Create a realistic distribution
  for (let i = 0; i < count - 1; i++) {
    const isCreditor = i < Math.floor(count * 0.3); // 30% are creditors
    const amount = isCreditor 
      ? Math.round((50 + Math.random() * 150) * 100) / 100
      : -Math.round((20 + Math.random() * 80) * 100) / 100;
    
    if (isCreditor) totalPositive += amount;
    
    balances.push({
      userId: `user${i}`,
      balance: amount,
      profile: { 
        name: `User ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`, 
        avatar_url: '', 
        user_id: `user${i}` 
      }
    });
  }
  
  // Last person balances everything
  balances.push({
    userId: `user${count - 1}`,
    balance: -totalPositive - balances.reduce((sum, b) => sum + b.balance, 0),
    profile: { name: `User ${String.fromCharCode(65 + ((count - 1) % 26))}`, avatar_url: '', user_id: `user${count - 1}` }
  });
  
  return balances;
}

interface TestResult {
  testId: string;
  passed: boolean;
  settlements: Settlement[];
  transactionCount: number;
  executionTime: number;
  error?: string;
}

export const SettlementTestRunner: React.FC = () => {
  const [testCases] = useState(generateTestCases());
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  
  const runAllTests = async () => {
    setRunning(true);
    setResults([]);
    
    for (const testCase of testCases) {
      setCurrentTest(testCase.id);
      
      try {
        const startTime = performance.now();
        const settlements = getOptimalSettlementSuggestions(testCase.balances);
        const executionTime = performance.now() - startTime;
        
        // Verify all balances sum to zero
        const balanceCheck = verifySettlements(testCase.balances, settlements);
        
        const result: TestResult = {
          testId: testCase.id,
          passed: balanceCheck && settlements.length <= testCase.expectedTransactions,
          settlements,
          transactionCount: settlements.length,
          executionTime,
          error: !balanceCheck ? 'Balances do not sum to zero after settlements' : undefined
        };
        
        setResults(prev => [...prev, result]);
        
        // Small delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        setResults(prev => [...prev, {
          testId: testCase.id,
          passed: false,
          settlements: [],
          transactionCount: 0,
          executionTime: 0,
          error: (error as Error).message
        }]);
      }
    }
    
    setCurrentTest(null);
    setRunning(false);
  };
  
  // Verify settlements balance out
  const verifySettlements = (balances: Balance[], settlements: Settlement[]): boolean => {
    const netBalances = new Map<string, number>();
    
    // Initialize with original balances
    balances.forEach(b => netBalances.set(b.userId, b.balance));
    
    // Apply settlements
    settlements.forEach(s => {
      netBalances.set(s.from, (netBalances.get(s.from) || 0) + s.amount);
      netBalances.set(s.to, (netBalances.get(s.to) || 0) - s.amount);
    });
    
    // Check all balances are near zero
    for (const [_, balance] of netBalances) {
      if (Math.abs(balance) > 0.01) return false;
    }
    
    return true;
  };
  
  const stats = {
    total: testCases.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    avgTime: results.length > 0 
      ? results.reduce((sum, r) => sum + r.executionTime, 0) / results.length 
      : 0
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-background rounded-lg border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settlement Algorithm Test Runner</h1>
            <p className="text-secondary-foreground mt-1">
              Automated testing across {testCases.length} scenarios
            </p>
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={running}
            size="lg"
          >
            {running ? (
              <>Running Tests...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Run All Tests</>
            )}
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-background rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-foreground">Total Tests</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700">Passed</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.passed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Failed</p>
                <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-background rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-foreground">Avg Time</p>
                <p className="text-2xl font-bold text-foreground">{stats.avgTime.toFixed(2)}ms</p>
              </div>
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>
      )}
      
      {/* Test Results */}
      <div className="space-y-4">
        {testCases.map((testCase) => {
          const result = results.find(r => r.testId === testCase.id);
          const isExpanded = expandedTest === testCase.id;
          const isRunning = currentTest === testCase.id;
          
          return (
            <div 
              key={testCase.id}
              className={`bg-background rounded-lg border ${
                result 
                  ? result.passed 
                    ? 'border-emerald-500' 
                    : 'border-red-500'
                  : 'border-border'
              } overflow-hidden`}
            >
              <button
                onClick={() => setExpandedTest(isExpanded ? null : testCase.id)}
                className="w-full p-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Status Icon */}
                    {isRunning ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    ) : result ? (
                      result.passed ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                    )}
                    
                    {/* Test Info */}
                    <div>
                      <h3 className="font-medium text-foreground">{testCase.name}</h3>
                      <p className="text-sm text-secondary-foreground">
                        {testCase.description} • {testCase.participants} participants
                      </p>
                    </div>
                  </div>
                  
                  {/* Results Summary */}
                  {result && (
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-secondary-foreground">
                        {result.transactionCount} transactions
                      </span>
                      <span className="text-secondary-foreground">
                        {result.executionTime.toFixed(2)}ms
                      </span>
                    </div>
                  )}
                </div>
              </button>
              
              {/* Expanded Details */}
              {isExpanded && result && (
                <div className="border-t border-border p-4 bg-secondary/10">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Balances */}
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Initial Balances</h4>
                      <div className="space-y-1 text-sm">
                        {testCase.balances.map((b) => (
                          <div key={b.userId} className="flex justify-between">
                            <span>{b.profile.name}</span>
                            <span className={b.balance > 0 ? 'text-emerald-600' : 'text-orange-600'}>
                              ${Math.abs(b.balance).toFixed(2)} {b.balance > 0 ? '(owed)' : '(owes)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Settlements */}
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Optimal Settlements</h4>
                      <div className="space-y-2 text-sm">
                        {result.settlements.map((s, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <span>{s.fromProfile.name}</span>
                            <ArrowRight className="h-3 w-3 text-primary" />
                            <span>{s.toProfile.name}</span>
                            <span className="font-medium">${s.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700">Error: {result.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};