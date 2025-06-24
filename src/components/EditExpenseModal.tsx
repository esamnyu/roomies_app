"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ExpenseWithDetails, Profile, HouseholdMember } from '@/lib/types/types';
import { useExpenseSplits } from '@/hooks/useExpenseSplits';
import { useAuth } from './AuthProvider';
import { ExpenseSplitter } from '@/components/ExpenseSplitter';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
// FIX 1: Import the correctly named 'updateExpense' function
import { updateExpense } from '@/lib/api';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseWithDetails;
  householdId: string;
  members: Profile[];
  onExpenseUpdated: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ isOpen, onClose, expense, householdId, members, onExpenseUpdated }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState(expense.description);
  const [date, setDate] = useState(new Date(expense.date).toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(expense.paid_by);
  const [submitting, setSubmitting] = useState(false);

  // FIX 2: Create an array that strictly matches the 'HouseholdMember' type
  const membersForHook: HouseholdMember[] = members.map(p => ({
    id: p.id, // Assuming profile id can stand in for household_member id
    user_id: p.id,
    household_id: householdId,
    role: 'member', // TypeScript now knows this is a valid role
    joined_at: '',  // Provide a dummy value for the required property
    profiles: p
  }));

  const {
    amount,
    setAmount,
    splitType,
    setSplitType,
    finalSplits,
    isValid,
    ...splitterProps
  } = useExpenseSplits(membersForHook, expense);

  useEffect(() => {
    setDescription(expense.description);
    setDate(new Date(expense.date).toISOString().split('T')[0]);
    setPaidBy(expense.paid_by);
    setAmount(expense.amount);
  }, [expense, setAmount]);

  const handleSubmit = async () => {
    if (!description || !isValid || !householdId || !paidBy) return;
    
    setSubmitting(true);
    try {
      // FIX 1: Call the correctly named 'updateExpense' function
      await updateExpense(expense.id, {
        description,
        amount,
        splits: finalSplits,
        paid_by: paidBy,
        date,
      });
      toast.success('Expense updated!');
      onExpenseUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error((error as Error).message || 'Failed to update expense');
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
        <h3 className="mb-4 text-lg font-medium text-foreground">Edit Expense</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Description</label>
            <Input 
              type="text" 
              className="mt-1"
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};