// src/components/AddExpenseModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createExpenseWithCustomSplits } from '@/lib/api/expenses';
import { toast } from 'react-hot-toast';
import type { HouseholdMember } from '@/lib/types/types';
import { useExpenseSplits } from '@/hooks/useExpenseSplits';
import { useAuth } from '../AuthProvider'; // NEW: Import useAuth
import { ExpenseSplitter } from '@/components/ExpenseSplitter';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AddExpenseModalProps {
  householdId: string;
  members: HouseholdMember[];
  onClose: () => void;
  onExpenseAdded: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ householdId, members, onClose, onExpenseAdded }) => {
  const { user } = useAuth(); // NEW: Get current user
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // NEW: State to manage who paid, defaults to the logged-in user
  const [paidBy, setPaidBy] = useState(user?.id || '');

  useEffect(() => {
    if (user?.id) {
        setPaidBy(user.id);
    }
  }, [user]);

  const {
    amount,
    setAmount,
    splitType,
    setSplitType,
    finalSplits,
    isValid,
    ...splitterProps
  } = useExpenseSplits(members);

  const handleSubmit = async () => {
    if (!description || !isValid || !householdId || !paidBy) { // MODIFIED: Check for paidBy
        if (!paidBy) toast.error("Please select who paid.");
        return;
    };
    
    setSubmitting(true);
    try {
      // MODIFIED: Pass paidBy and date to the API function
      await createExpenseWithCustomSplits(householdId, description, amount, finalSplits, date, paidBy);
      toast.success('Expense added!');
      onExpenseAdded();
      onClose();
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error((error as Error).message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };
  
  const selectStyles = "mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-background rounded-lg p-6 max-w-2xl w-full my-8">
        <h3 className="text-lg font-medium text-foreground mb-4">Add Expense</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Description</label>
            <Input 
              type="text" 
              className="mt-1"
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What's this expense for?" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Total Amount</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-secondary-foreground sm:text-sm">$</span>
              </div>
              <Input 
                type="number" 
                step="0.01" 
                className="pl-7"
                value={amount || ''} 
                onChange={(e) => setAmount(parseFloat(e.target.value))} 
                placeholder="0.00" 
              />
            </div>
          </div>
          
          {/* NEW: Dropdown to select who paid */}
          <div>
              <label className="block text-sm font-medium text-foreground">Paid by</label>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={selectStyles}>
                  {members.map(member => (
                      <option key={member.user_id} value={member.user_id}>
                          {member.profiles?.name || 'Unknown'}
                      </option>
                  ))}
              </select>
          </div>

          {/* NEW: Input for date */}
          <div>
              <label className="block text-sm font-medium text-foreground">Date</label>
              <Input
                  type="date"
                  className="mt-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
              />
          </div>
          
          <ExpenseSplitter
            members={members}
            amount={amount}
            splitType={splitType}
            setSplitType={setSplitType}
            finalSplits={finalSplits}
            isValid={isValid}
            {...splitterProps}
          />

        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button onClick={onClose} variant="secondary" disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !description || !amount || !isValid}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Expense'}
          </Button>
        </div>
      </div>
    </div>
  );
};