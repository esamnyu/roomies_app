'use client';

import React, { useState } from 'react';
import { AddExpense, AddExpenseButton } from '@/components/AddExpense';
import { Button } from '@/components/primitives/Button';
import { Monitor, Smartphone, MessageSquare, CreditCard } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Mock data for testing
const mockHouseholdMembers = [
  { id: '1', name: 'Alice Johnson', avatar: '' },
  { id: '2', name: 'Bob Smith', avatar: '' },
  { id: '3', name: 'Charlie Brown', avatar: '' },
  { id: '4', name: 'Diana Prince', avatar: '' },
];

export default function TestExpenseSplitterPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showAdaptive, setShowAdaptive] = useState(false);
  const [context, setContext] = useState<'dashboard' | 'settlement' | 'chat' | 'expenses'>('dashboard');

  const handleAddExpense = async (expense: any) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newExpense = {
      ...expense,
      id: Date.now().toString(),
    };
    
    setExpenses([...expenses, newExpense]);
    
    toast.success('Expense added successfully!', {
      duration: 3000,
      position: 'top-center',
    });
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <Toaster />
      
      {/* Header */}
      <header className="sticky top-0 z-sticky bg-white shadow-sm border-b border-secondary-200">
        <div className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center h-14 md:h-16">
            <h1 className="text-lg md:text-xl font-semibold text-secondary-900">
              Adaptive Expense Splitter Demo
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 md:px-6 md:py-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Introduction */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-secondary-200">
            <h2 className="text-lg font-semibold mb-3">Adaptive Expense Component</h2>
            <p className="text-secondary-600 mb-4">
              The AddExpense component automatically adapts based on:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-secondary-900 mb-2 flex items-center">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Devices
                </h3>
                <ul className="space-y-1 text-sm text-secondary-600">
                  <li>• Always full screen</li>
                  <li>• Optimized touch targets</li>
                  <li>• Step-by-step flow</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-secondary-900 mb-2 flex items-center">
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop Devices
                </h3>
                <ul className="space-y-1 text-sm text-secondary-600">
                  <li>• Modal for quick adds</li>
                  <li>• Full screen for complex flows</li>
                  <li>• "Expand" option available</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Context Selector */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-secondary-200">
            <h3 className="font-semibold mb-3">Test Different Contexts:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => setContext('dashboard')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  context === 'dashboard' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                <div className="text-sm font-medium">Dashboard</div>
                <div className="text-xs text-secondary-600 mt-1">Full focus</div>
              </button>
              <button
                onClick={() => setContext('expenses')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  context === 'expenses' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                <div className="text-sm font-medium">Expenses</div>
                <div className="text-xs text-secondary-600 mt-1">Full focus</div>
              </button>
              <button
                onClick={() => setContext('settlement')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  context === 'settlement' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                <div className="text-sm font-medium">Settlement</div>
                <div className="text-xs text-secondary-600 mt-1">Quick add</div>
              </button>
              <button
                onClick={() => setContext('chat')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  context === 'chat' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                <div className="text-sm font-medium">Chat</div>
                <div className="text-xs text-secondary-600 mt-1">Quick add</div>
              </button>
            </div>
          </div>

          {/* Test Instructions */}
          <div className="bg-info-50 border border-info-200 rounded-xl p-4">
            <h3 className="font-medium text-info-900 mb-1">How it works:</h3>
            <ul className="text-sm text-info-800 space-y-1">
              <li>• <strong>Mobile:</strong> Always shows full screen regardless of context</li>
              <li>• <strong>Desktop + Dashboard/Expenses:</strong> Shows full screen for focused work</li>
              <li>• <strong>Desktop + Settlement/Chat:</strong> Shows modal for quick actions</li>
              <li>• <strong>Desktop Modal:</strong> Has "Expand" button to go full screen</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Direct component usage */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => setShowAdaptive(true)}
                className="min-w-[200px]"
              >
                Open Adaptive Component
              </Button>
            </div>
            
            {/* Button wrapper examples */}
            <div className="flex flex-wrap justify-center gap-3">
              <AddExpenseButton
                householdMembers={mockHouseholdMembers}
                currentUserId="1"
                onAddExpense={handleAddExpense}
                context="settlement"
                className="text-sm"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                From Settlement
              </AddExpenseButton>
              
              <AddExpenseButton
                householdMembers={mockHouseholdMembers}
                currentUserId="1"
                onAddExpense={handleAddExpense}
                context="chat"
                className="text-sm"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                From Chat
              </AddExpenseButton>
            </div>
          </div>

          {/* Device Detection Info */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-secondary-200">
            <div className="text-sm text-secondary-600">
              <strong>Current detection:</strong> You're viewing this on a{' '}
              <span className="font-semibold text-secondary-900">
                <span className="inline md:hidden">mobile device (full screen mode)</span>
                <span className="hidden md:inline">desktop device (adaptive mode)</span>
              </span>
            </div>
          </div>

          {/* Added Expenses */}
          {expenses.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-secondary-900">Recent Expenses:</h3>
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-secondary-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{expense.description}</h4>
                      <p className="text-sm text-secondary-600">
                        ${expense.amount.toFixed(2)} • {expense.category}
                      </p>
                    </div>
                    <span className="text-xs text-secondary-500">
                      {new Date(expense.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Adaptive AddExpense component */}
      <AddExpense
        isOpen={showAdaptive}
        onCancel={() => setShowAdaptive(false)}
        householdMembers={mockHouseholdMembers}
        currentUserId="1"
        onAddExpense={handleAddExpense}
        context={context}
      />
    </div>
  );
}