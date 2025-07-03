"use client";

import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, Lock, DollarSign, Edit3, Info, RefreshCw } from 'lucide-react';
import { getOptimalSettlementSuggestions } from '@/lib/api/optimal-settlements';
import type { Balance } from '@/lib/api/optimal-settlements';
import { Button } from '@/components/primitives/Button';
import type { Expense, ExpenseSplit, ExpenseSplitAdjustment } from '@/lib/types/types';

// Test data generators
const generateMockExpense = (id: string, amount: number, paidBy: string, splits: ExpenseSplit[]): Expense => ({
  id,
  household_id: 'test-household',
  description: 'Test Expense',
  amount,
  paid_by: paidBy,
  date: new Date().toISOString(),
  created_by: paidBy,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1,
  expense_splits: splits,
  recurring_expense_id: null
});

const generateMockSplit = (
  expenseId: string, 
  userId: string, 
  amount: number, 
  settled: boolean = false
): ExpenseSplit => ({
  id: `split-${expenseId}-${userId}`,
  expense_id: expenseId,
  user_id: userId,
  amount,
  settled,
  settled_at: settled ? new Date().toISOString() : null,
  expense_split_adjustments: [],
  profiles: {
    id: userId,
    user_id: userId,
    name: `User ${userId.toUpperCase()}`,
    avatar_url: ''
  }
});

const generateAdjustment = (
  splitId: string,
  amount: number,
  reason: string
): ExpenseSplitAdjustment => ({
  id: `adj-${splitId}-${Date.now()}`,
  expense_split_id: splitId,
  adjustment_amount: amount,
  reason,
  created_at: new Date().toISOString(),
  created_by: 'test-user'
});

// Test scenarios
interface TestScenario {
  id: string;
  name: string;
  description: string;
  initialExpense: Expense;
  settlement: { from: string; to: string; amount: number };
  editAction: {
    type: 'increase' | 'decrease' | 'change-payer' | 'remove-user';
    details: any;
  };
  expectedAdjustments: { userId: string; amount: number }[];
}

const testScenarios: TestScenario[] = [
  {
    id: 'increase-split',
    name: 'Increase Split Amount',
    description: 'User A\'s split increases from $50 to $60 after settlement',
    initialExpense: generateMockExpense('exp1', 150, 'A', [
      generateMockSplit('exp1', 'A', 50, true),
      generateMockSplit('exp1', 'B', 50, false),
      generateMockSplit('exp1', 'C', 50, false)
    ]),
    settlement: { from: 'B', to: 'A', amount: 50 },
    editAction: {
      type: 'increase',
      details: { userId: 'A', newAmount: 60, totalAmount: 180 }
    },
    expectedAdjustments: [
      { userId: 'A', amount: -10 } // Owes $10 more
    ]
  },
  {
    id: 'decrease-split',
    name: 'Decrease Split Amount',
    description: 'User B\'s split decreases from $50 to $30 after settlement',
    initialExpense: generateMockExpense('exp2', 150, 'A', [
      generateMockSplit('exp2', 'A', 50, false),
      generateMockSplit('exp2', 'B', 50, true),
      generateMockSplit('exp2', 'C', 50, false)
    ]),
    settlement: { from: 'B', to: 'A', amount: 50 },
    editAction: {
      type: 'decrease',
      details: { userId: 'B', newAmount: 30, totalAmount: 130 }
    },
    expectedAdjustments: [
      { userId: 'B', amount: 20 } // Gets $20 credit
    ]
  },
  {
    id: 'change-payer',
    name: 'Change Expense Payer',
    description: 'Change payer from A to C after B settled with A',
    initialExpense: generateMockExpense('exp3', 90, 'A', [
      generateMockSplit('exp3', 'A', 30, false),
      generateMockSplit('exp3', 'B', 30, true),
      generateMockSplit('exp3', 'C', 30, false)
    ]),
    settlement: { from: 'B', to: 'A', amount: 30 },
    editAction: {
      type: 'change-payer',
      details: { newPayer: 'C' }
    },
    expectedAdjustments: [
      { userId: 'A', amount: -60 }, // A now owes their split + what they paid
      { userId: 'C', amount: 60 }   // C is now owed for paying
    ]
  },
  {
    id: 'remove-user',
    name: 'Remove User from Split',
    description: 'Remove user B after they settled their portion',
    initialExpense: generateMockExpense('exp4', 120, 'A', [
      generateMockSplit('exp4', 'A', 40, false),
      generateMockSplit('exp4', 'B', 40, true),
      generateMockSplit('exp4', 'C', 40, false)
    ]),
    settlement: { from: 'B', to: 'A', amount: 40 },
    editAction: {
      type: 'remove-user',
      details: { removeUserId: 'B', newTotal: 80 }
    },
    expectedAdjustments: [
      { userId: 'B', amount: 40 } // Full refund since removed
    ]
  }
];

export const SettledExpenseTestSuite: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<TestScenario>(testScenarios[0]);
  const [currentStep, setCurrentStep] = useState<'initial' | 'settled' | 'edited'>('initial');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  
  // Calculate balances at each step
  const balances = useMemo(() => {
    const users = ['A', 'B', 'C'];
    const balancesByStep: Record<string, Balance[]> = {};
    
    // Initial balances
    const initial = users.map(userId => {
      const split = selectedScenario.initialExpense.expense_splits?.find(s => s.user_id === userId);
      const isPayer = selectedScenario.initialExpense.paid_by === userId;
      const balance = isPayer 
        ? selectedScenario.initialExpense.amount - (split?.amount || 0)
        : -(split?.amount || 0);
      
      return {
        userId,
        balance,
        profile: { name: `User ${userId}`, avatar_url: '', user_id: userId }
      };
    });
    balancesByStep.initial = initial;
    
    // After settlement
    const afterSettlement = initial.map(b => {
      const settlement = selectedScenario.settlement;
      if (b.userId === settlement.from) {
        return { ...b, balance: b.balance + settlement.amount };
      } else if (b.userId === settlement.to) {
        return { ...b, balance: b.balance - settlement.amount };
      }
      return b;
    });
    balancesByStep.settled = afterSettlement;
    
    // After edit with adjustments
    const afterEdit = afterSettlement.map(b => {
      const adjustment = selectedScenario.expectedAdjustments.find(a => a.userId === b.userId);
      if (adjustment) {
        return { ...b, balance: b.balance - adjustment.amount };
      }
      return b;
    });
    balancesByStep.edited = afterEdit;
    
    return balancesByStep;
  }, [selectedScenario]);
  
  // Get settlement suggestions for current step
  const settlementSuggestions = useMemo(() => {
    const currentBalances = balances[currentStep];
    return getOptimalSettlementSuggestions(currentBalances);
  }, [balances, currentStep]);
  
  const handleEdit = () => {
    // Check if any splits are settled
    const hasSettledSplits = selectedScenario.initialExpense.expense_splits?.some(s => s.settled);
    if (hasSettledSplits) {
      setShowWarningDialog(true);
    } else {
      setCurrentStep('edited');
    }
  };
  
  const confirmEdit = () => {
    setShowWarningDialog(false);
    setCurrentStep('edited');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Settled Expense Editing Test Suite</h1>
        <p className="text-secondary-foreground">
          Test how the system handles editing expenses after they've been settled
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Select Test Scenario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {testScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                setSelectedScenario(scenario);
                setCurrentStep('initial');
              }}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedScenario.id === scenario.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <h3 className="font-medium text-foreground">{scenario.name}</h3>
              <p className="text-sm text-secondary-foreground mt-1">{scenario.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step Progress */}
      <div className="bg-background rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Test Progress</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep('initial')}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentStep('initial')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              currentStep === 'initial' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>1. Initial Expense</span>
          </button>
          
          <ArrowRight className="h-4 w-4 text-secondary-foreground" />
          
          <button
            onClick={() => currentStep !== 'initial' && setCurrentStep('settled')}
            disabled={currentStep === 'initial'}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              currentStep === 'settled' 
                ? 'bg-primary text-primary-foreground' 
                : currentStep === 'initial'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>2. After Settlement</span>
          </button>
          
          <ArrowRight className="h-4 w-4 text-secondary-foreground" />
          
          <button
            onClick={() => currentStep === 'settled' && handleEdit()}
            disabled={currentStep !== 'settled'}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              currentStep === 'edited' 
                ? 'bg-primary text-primary-foreground' 
                : currentStep !== 'settled'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span>3. After Edit</span>
          </button>
        </div>
      </div>

      {/* Current State Display */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Expense Details */}
        <div className="bg-background rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Expense Details {currentStep === 'edited' && '(After Edit)'}
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-secondary-foreground">Total Amount:</span>
              <span className="font-medium">
                ${currentStep === 'edited' && selectedScenario.editAction.details.totalAmount 
                  ? selectedScenario.editAction.details.totalAmount 
                  : selectedScenario.initialExpense.amount}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-secondary-foreground">Paid By:</span>
              <span className="font-medium">
                User {currentStep === 'edited' && selectedScenario.editAction.type === 'change-payer'
                  ? selectedScenario.editAction.details.newPayer
                  : selectedScenario.initialExpense.paid_by}
              </span>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-foreground mb-2">Splits:</p>
              <div className="space-y-2">
                {selectedScenario.initialExpense.expense_splits?.map((split) => {
                  // Skip removed users
                  if (currentStep === 'edited' && 
                      selectedScenario.editAction.type === 'remove-user' && 
                      split.user_id === selectedScenario.editAction.details.removeUserId) {
                    return null;
                  }
                  
                  // Calculate current split amount
                  let currentAmount = split.amount;
                  if (currentStep === 'edited') {
                    if (selectedScenario.editAction.type === 'increase' && 
                        split.user_id === selectedScenario.editAction.details.userId) {
                      currentAmount = selectedScenario.editAction.details.newAmount;
                    } else if (selectedScenario.editAction.type === 'decrease' && 
                               split.user_id === selectedScenario.editAction.details.userId) {
                      currentAmount = selectedScenario.editAction.details.newAmount;
                    }
                  }
                  
                  const isSettled = currentStep !== 'initial' && split.settled;
                  
                  return (
                    <div key={split.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">User {split.user_id}</span>
                        {isSettled && <Lock className="h-3 w-3 text-yellow-600" />}
                      </div>
                      <span className="text-sm font-medium">${currentAmount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Show adjustments if edited */}
            {currentStep === 'edited' && selectedScenario.expectedAdjustments.length > 0 && (
              <div className="border-t pt-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm font-medium text-foreground">Adjustments Applied:</p>
                </div>
                <div className="space-y-1">
                  {selectedScenario.expectedAdjustments.map((adj) => (
                    <div key={adj.userId} className="flex items-center justify-between text-sm">
                      <span>User {adj.userId}</span>
                      <span className={adj.amount > 0 ? 'text-emerald-600' : 'text-orange-600'}>
                        {adj.amount > 0 ? '+' : ''}{adj.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Balance Summary */}
        <div className="bg-background rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">User Balances</h3>
          
          <div className="space-y-3">
            {balances[currentStep].map((balance) => (
              <div key={balance.userId} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    balance.balance > 0.01 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : balance.balance < -0.01
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {balance.profile.name.charAt(5)}
                  </div>
                  <span className="font-medium">{balance.profile.name}</span>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    balance.balance > 0.01 
                      ? 'text-emerald-600' 
                      : balance.balance < -0.01
                      ? 'text-orange-600'
                      : 'text-gray-600'
                  }`}>
                    ${Math.abs(balance.balance).toFixed(2)}
                  </p>
                  <p className="text-xs text-secondary-foreground">
                    {balance.balance > 0.01 ? 'is owed' : balance.balance < -0.01 ? 'owes' : 'settled'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Settlement needed indicator */}
          {settlementSuggestions.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                {settlementSuggestions.length} settlement{settlementSuggestions.length > 1 ? 's' : ''} needed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Settlement Suggestions */}
      {settlementSuggestions.length > 0 && (
        <div className="bg-background rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Settlement Suggestions {currentStep === 'edited' && '(After Adjustments)'}
          </h3>
          <div className="space-y-3">
            {settlementSuggestions.map((settlement, idx) => (
              <div key={idx} className="flex items-center p-3 bg-secondary/30 rounded-lg">
                <span className="font-medium">{settlement.fromProfile.name}</span>
                <div className="flex-1 flex items-center justify-center space-x-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span className="font-bold">${settlement.amount.toFixed(2)}</span>
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">{settlement.toProfile.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      {currentStep === 'settled' && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">Ready to test editing</p>
              <p className="text-sm text-blue-700 mt-1">
                Click "After Edit" to simulate editing this settled expense. 
                The system will show a warning and create adjustments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Dialog Mock */}
      {showWarningDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <h3 className="text-lg font-bold text-foreground">
                Settled Splits Affected
              </h3>
            </div>
            <p className="text-sm text-secondary-foreground mb-6">
              You are editing an expense that has already been settled by one or more members.
              Proceeding will create adjustments to their balances. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button onClick={() => setShowWarningDialog(false)} variant="secondary">
                Cancel Edit
              </Button>
              <Button onClick={confirmEdit} variant="danger">
                Proceed Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};