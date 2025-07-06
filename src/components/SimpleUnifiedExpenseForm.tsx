'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createExpenseWithCustomSplits, updateExpense as updateExpenseAPI, deleteExpense } from '@/lib/api/expenses';
import { toast } from 'react-hot-toast';
import { createFriendlyErrorMessage } from '@/lib/utils/errorFormatter';
import type { HouseholdMember, Expense } from '@/lib/types/types';
import { useSimpleExpenseSplits } from '@/hooks/useSimpleExpenseSplits';
import { ExpenseSplitterV2 } from '@/components/ExpenseSplitterV2';
import { Button } from '@/components/primitives/Button/Button';
import { Input } from '@/components/primitives/Input/Input';

interface SimpleUnifiedExpenseFormProps {
  householdId: string;
  householdMembers: HouseholdMember[];
  isOpen: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentUserId: string;
  mode?: 'create' | 'edit';
  expense?: Expense | null;
}

export const SimpleUnifiedExpenseForm: React.FC<SimpleUnifiedExpenseFormProps> = ({ 
  householdId, 
  householdMembers: members, 
  isOpen,
  onCancel, 
  onSuccess,
  currentUserId,
  mode = 'create',
  expense
}) => {
  const [description, setDescription] = useState(expense?.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(expense?.paid_by || currentUserId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    amount,
    setAmount,
    splitMode,
    setSplitMode,
    selectedParticipants,
    toggleParticipant,
    customAmounts,
    setCustomAmount,
    percentages,
    setPercentage,
    splits: finalSplits,
    validation,
    totalSplitAmount,
    totalPercentage
  } = useSimpleExpenseSplits(members, expense);

  useEffect(() => {
    if (currentUserId && !paidBy) {
      setPaidBy(currentUserId);
    }
  }, [currentUserId, paidBy]);

  const handleSubmit = async () => {
    if (!description || !validation.isValid || !householdId || !paidBy) {
      if (!paidBy) toast.error("Please select who paid.");
      if (!validation.isValid && validation.errors.length > 0) {
        toast.error(validation.errors[0]);
      }
      return;
    }
    
    setSubmitting(true);
    try {
      if (mode === 'edit' && expense) {
        await updateExpenseAPI(expense.id, {
          description,
          amount,
          splits: finalSplits,
          paid_by: paidBy,
          date
        });
        toast.success('Expense updated!');
      } else {
        await createExpenseWithCustomSplits(householdId, description, amount, finalSplits, date, paidBy);
        toast.success('Expense added!');
      }
      onSuccess();
      onCancel();
    } catch (error) {
      console.error('Error with expense:', error);
      toast.error(createFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteExpense(expense.id);
      
      if (result.message.includes('reversed')) {
        toast.success('Settled expense has been reversed');
      } else {
        toast.success('Expense deleted successfully');
      }
      
      onSuccess();
      onCancel();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-background rounded-lg p-6 max-w-2xl w-full my-8">
        <h3 className="text-lg font-medium text-foreground mb-4">
          {mode === 'edit' ? 'Edit Expense' : 'Add Expense'}
        </h3>
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
            <label className="block text-sm font-medium text-foreground">Amount</label>
            <Input 
              type="number" 
              step="0.01"
              className="mt-1"
              value={amount || ''} 
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} 
              placeholder="0.00"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Date</label>
              <Input 
                type="date" 
                className="mt-1"
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground">Who paid?</label>
              <select 
                className="mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={paidBy} 
                onChange={(e) => setPaidBy(e.target.value)}
              >
                <option value="">Select who paid</option>
                {members.map(member => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.profiles?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ExpenseSplitterV2
            members={members}
            amount={amount}
            splitMode={splitMode}
            setSplitMode={setSplitMode}
            includedMembers={selectedParticipants}
            toggleMemberInclusion={toggleParticipant}
            customSplits={customAmounts}
            setCustomSplits={(splits) => {
              Object.entries(splits).forEach(([userId, amount]) => {
                setCustomAmount(userId, amount);
              });
            }}
            percentageSplits={percentages}
            setPercentageSplits={(splits) => {
              Object.entries(splits).forEach(([userId, percentage]) => {
                setPercentage(userId, percentage);
              });
            }}
            finalSplits={finalSplits}
            isValid={validation.isValid}
            totalSplitValue={totalSplitAmount}
            totalPercentageValue={totalPercentage}
          />

          <div className="flex justify-between pt-4">
            <div>
              {mode === 'edit' && (
                <>
                  {showDeleteConfirm ? (
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleDelete}
                        variant="danger"
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Delete'}
                      </Button>
                      <Button 
                        onClick={() => setShowDeleteConfirm(false)}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setShowDeleteConfirm(true)}
                      variant="danger"
                    >
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={onCancel} variant="secondary">Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'edit' ? 'Update' : 'Add Expense'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};