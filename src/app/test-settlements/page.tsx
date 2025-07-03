"use client";

import { useState } from 'react';
import { SettlementUITestSuite } from '@/components/SettlementUITestSuite';
import { SettlementTestRunner } from '@/components/SettlementTestRunner';
import { SettledExpenseTestSuite } from '@/components/SettledExpenseTestSuite';
import { Button } from '@/components/primitives/Button';

export default function TestSettlementsPage() {
  const [view, setView] = useState<'visual' | 'automated' | 'settled'>('visual');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Settlement Testing Suite</h1>
            <div className="flex space-x-2">
              <Button
                variant={view === 'visual' ? 'primary' : 'outline'}
                onClick={() => setView('visual')}
              >
                Visual Test Suite
              </Button>
              <Button
                variant={view === 'automated' ? 'primary' : 'outline'}
                onClick={() => setView('automated')}
              >
                Automated Tests
              </Button>
              <Button
                variant={view === 'settled' ? 'primary' : 'outline'}
                onClick={() => setView('settled')}
              >
                Settled Expense Editing
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="py-6">
        {view === 'visual' ? (
          <SettlementUITestSuite />
        ) : view === 'automated' ? (
          <SettlementTestRunner />
        ) : (
          <SettledExpenseTestSuite />
        )}
      </div>
    </div>
  );
}