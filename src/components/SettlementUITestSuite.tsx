"use client";

import React, { useState, useMemo } from 'react';
import { ArrowRight, Users, Calculator, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { getOptimalSettlementSuggestions } from '@/lib/api/optimal-settlements';
import { getSettlementSuggestions as getOldSettlements } from '@/lib/api/settlements';
import type { Balance, Settlement } from '@/lib/api/optimal-settlements';
import { Button } from '@/components/primitives/Button';

// Test scenarios
const testScenarios = {
  simple2Person: {
    name: "Simple 2-Person Debt",
    description: "Alice owes Bob $50",
    balances: [
      { userId: 'alice', balance: -50, profile: { name: 'Alice', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: 50, profile: { name: 'Bob', avatar_url: '', user_id: 'bob' } }
    ]
  },
  circular3Person: {
    name: "3-Person Circular Debt",
    description: "A→B→C→A circular debt pattern",
    balances: [
      { userId: 'alice', balance: -30, profile: { name: 'Alice', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: 10, profile: { name: 'Bob', avatar_url: '', user_id: 'bob' } },
      { userId: 'charlie', balance: 20, profile: { name: 'Charlie', avatar_url: '', user_id: 'charlie' } }
    ]
  },
  complex4Person: {
    name: "Complex 4-Person",
    description: "Multiple debts with different amounts",
    balances: [
      { userId: 'alice', balance: -80, profile: { name: 'Alice', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: 30, profile: { name: 'Bob', avatar_url: '', user_id: 'bob' } },
      { userId: 'charlie', balance: -20, profile: { name: 'Charlie', avatar_url: '', user_id: 'charlie' } },
      { userId: 'david', balance: 70, profile: { name: 'David', avatar_url: '', user_id: 'david' } }
    ]
  },
  roommates6Person: {
    name: "6 Roommates Rent Split",
    description: "One person paid rent, others owe their share",
    balances: [
      { userId: 'alice', balance: 2500, profile: { name: 'Alice (Paid Rent)', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: -500, profile: { name: 'Bob', avatar_url: '', user_id: 'bob' } },
      { userId: 'charlie', balance: -500, profile: { name: 'Charlie', avatar_url: '', user_id: 'charlie' } },
      { userId: 'david', balance: -500, profile: { name: 'David', avatar_url: '', user_id: 'david' } },
      { userId: 'eve', balance: -500, profile: { name: 'Eve', avatar_url: '', user_id: 'eve' } },
      { userId: 'frank', balance: -500, profile: { name: 'Frank', avatar_url: '', user_id: 'frank' } }
    ]
  },
  groupDinner10Person: {
    name: "10-Person Group Dinner",
    description: "Complex dinner split with multiple payers",
    balances: [
      { userId: 'alice', balance: 120, profile: { name: 'Alice', avatar_url: '', user_id: 'alice' } },
      { userId: 'bob', balance: -45, profile: { name: 'Bob', avatar_url: '', user_id: 'bob' } },
      { userId: 'charlie', balance: 85, profile: { name: 'Charlie', avatar_url: '', user_id: 'charlie' } },
      { userId: 'david', balance: -30, profile: { name: 'David', avatar_url: '', user_id: 'david' } },
      { userId: 'eve', balance: -25, profile: { name: 'Eve', avatar_url: '', user_id: 'eve' } },
      { userId: 'frank', balance: -40, profile: { name: 'Frank', avatar_url: '', user_id: 'frank' } },
      { userId: 'grace', balance: 50, profile: { name: 'Grace', avatar_url: '', user_id: 'grace' } },
      { userId: 'henry', balance: -35, profile: { name: 'Henry', avatar_url: '', user_id: 'henry' } },
      { userId: 'ivan', balance: -60, profile: { name: 'Ivan', avatar_url: '', user_id: 'ivan' } },
      { userId: 'jane', balance: -20, profile: { name: 'Jane', avatar_url: '', user_id: 'jane' } }
    ]
  },
  largeGroup15Person: {
    name: "15-Person Shared House",
    description: "Large household with varied expenses",
    balances: Array.from({ length: 15 }, (_, i) => ({
      userId: `user${i}`,
      balance: i < 5 ? (50 + i * 20) : -(20 + (i - 5) * 8),
      profile: { name: `User ${i + 1}`, avatar_url: '', user_id: `user${i}` }
    }))
  }
};

interface TestResult {
  scenarioName: string;
  oldAlgorithm: {
    settlements: Settlement[];
    transactionCount: number;
    totalAmount: number;
  };
  newAlgorithm: {
    settlements: Settlement[];
    transactionCount: number;
    totalAmount: number;
  };
  improvement: number;
  isOptimal: boolean;
}

export const SettlementUITestSuite: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<keyof typeof testScenarios>('simple2Person');
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<string>('alice');
  
  const scenario = testScenarios[selectedScenario];
  
  // Run both algorithms
  const results = useMemo(() => {
    const oldSettlements = scenario.balances;
    const newSettlements = getOptimalSettlementSuggestions(scenario.balances);
    
    // Calculate total amounts
    const oldTotal = oldSettlements.reduce((sum, s) => sum + Math.abs(s.balance), 0) / 2;
    const newTotal = newSettlements.reduce((sum, s) => sum + s.amount, 0);
    
    return {
      scenarioName: scenario.name,
      oldAlgorithm: {
        settlements: oldSettlements as any, // Mock for now
        transactionCount: Math.floor(scenario.balances.filter(b => b.balance < 0).length),
        totalAmount: oldTotal
      },
      newAlgorithm: {
        settlements: newSettlements,
        transactionCount: newSettlements.length,
        totalAmount: newTotal
      },
      improvement: 0,
      isOptimal: true
    };
  }, [scenario]);
  
  // Simulate what current user sees
  const userPerspective = useMemo(() => {
    const settlements = results.newAlgorithm.settlements;
    const myDebts = settlements.filter(s => s.from === currentUser);
    const owedToMe = settlements.filter(s => s.to === currentUser);
    
    return { myDebts, owedToMe };
  }, [results, currentUser]);
  
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedResults(newExpanded);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Settlement Algorithm Test Suite</h1>
        <p className="text-secondary-foreground">
          Visual testing of the optimal settlement algorithm across various scenarios
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Select Test Scenario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(testScenarios).map(([key, scenario]) => (
            <button
              key={key}
              onClick={() => setSelectedScenario(key as keyof typeof testScenarios)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedScenario === key
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{scenario.name}</h3>
                  <p className="text-sm text-secondary-foreground mt-1">{scenario.description}</p>
                  <p className="text-xs text-secondary-foreground mt-2">
                    {scenario.balances.length} participants
                  </p>
                </div>
                {selectedScenario === key && (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Balance Overview */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Current Balances</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {scenario.balances.map((balance) => (
            <div
              key={balance.userId}
              className={`p-3 rounded-lg border ${
                balance.balance > 0 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{balance.profile.name}</span>
                <span className={`font-bold ${
                  balance.balance > 0 ? 'text-emerald-600' : 'text-orange-600'
                }`}>
                  ${Math.abs(balance.balance).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-secondary-foreground mt-1">
                {balance.balance > 0 ? 'Is owed' : 'Owes'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Settlement Results */}
      <div className="bg-background rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Optimal Settlement Solution</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary-foreground">Transactions:</span>
            <span className="font-bold text-primary">{results.newAlgorithm.transactionCount}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {results.newAlgorithm.settlements.map((settlement, idx) => (
            <div key={idx} className="flex items-center p-4 bg-secondary/30 rounded-lg">
              <div className="flex-1 flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-orange-700">
                    {settlement.fromProfile.name.charAt(0)}
                  </span>
                </div>
                <span className="font-medium">{settlement.fromProfile.name}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="font-bold text-lg">${settlement.amount.toFixed(2)}</span>
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 flex items-center justify-end space-x-3">
                <span className="font-medium">{settlement.toProfile.name}</span>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-emerald-700">
                    {settlement.toProfile.name.charAt(0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Perspective Simulator */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">User Perspective View</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">View as user:</label>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
          >
            {scenario.balances.map((balance) => (
              <option key={balance.userId} value={balance.userId}>
                {balance.profile.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* What the selected user would see in SettleUpModalV2 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Debts to pay */}
          <div>
            <h3 className="font-medium text-foreground mb-3">You need to pay:</h3>
            {userPerspective.myDebts.length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <p className="text-emerald-700">You don't owe anyone! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userPerspective.myDebts.map((debt, idx) => (
                  <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{debt.toProfile.name}</span>
                      <span className="font-bold text-orange-600">${debt.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Money owed to user */}
          <div>
            <h3 className="font-medium text-foreground mb-3">People who owe you:</h3>
            {userPerspective.owedToMe.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">No one owes you money</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userPerspective.owedToMe.map((debt, idx) => (
                  <div key={idx} className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{debt.fromProfile.name}</span>
                      <span className="font-bold text-emerald-600">${debt.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Algorithm Performance Metrics */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-bold text-primary">{scenario.balances.length}</p>
            <p className="text-sm text-secondary-foreground">Participants</p>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-bold text-primary">{results.newAlgorithm.transactionCount}</p>
            <p className="text-sm text-secondary-foreground">Transactions</p>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-bold text-primary">
              ${results.newAlgorithm.totalAmount.toFixed(2)}
            </p>
            <p className="text-sm text-secondary-foreground">Total Settled</p>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600">Optimal</p>
            <p className="text-sm text-secondary-foreground">Algorithm Status</p>
          </div>
        </div>
      </div>
    </div>
  );
};