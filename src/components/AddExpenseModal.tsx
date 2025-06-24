"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
// FIX: Import the correctly named function
import { createExpenseWithCustomSplits } from '@/lib/api/expenses';
import { toast } from 'react-hot-toast';
// FIX: Import Profile and HouseholdMember for correct typing
import type { Profile, HouseholdMember } from '@/lib/types/types';
import { useExpenseSplits } from '@/hooks/useExpenseSplits';
import { useAuth } from './AuthProvider';
import { ExpenseSplitter } from '@/components/ExpenseSplitter';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AddExpenseModalProps {
  isOpen: boolean;
  householdId: string;
  members: Profile[];
  onClose: () => void;
  onExpenseAdded: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, householdId, members, onClose, onExpenseAdded }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(user?.id || '');

  useEffect(() => {
    if (isOpen && user?.id) {
      setPaidBy(user.id);
    }
  }, [isOpen, user]);

  // FIX: Create an array that strictly matches the 'HouseholdMember' type for the hook
  const membersForHook: HouseholdMember[] = members.map(p => ({
    id: p.id,
    user_id: p.id,
    household_id: householdId,
    role: 'member',
    joined_at: '',
    profiles: p,
  }));

  const {
    amount,
    setAmount,
    splitType,
    setSplitType,
    finalSplits,
    isValid,
    ...splitterProps
  } = useExpenseSplits(membersForHook);

  const handleSubmit = async () => {
    if (!description || !isValid || !householdId || !paidBy) {
      if (!paidBy) toast.error("Please select who paid.");
      return;
    };
    
    setSubmitting(true);
    try {
      // FIX: Call the correctly named function
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
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-lg bg-background p-6">
        <h3 className="mb-4 text-lg font-medium text-foreground">Add Expense</h3>
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
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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
          
          <div>
              <label className="block text-sm font-medium text-foreground">Paid by</label>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={selectStyles}>
                  {members.map(member => (
                      <option key={member.id} value={member.id}>
                          {member.name || 'Unknown'}
                      </option>
                  ))}
              </select>
          </div>

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
            members={membersForHook}
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