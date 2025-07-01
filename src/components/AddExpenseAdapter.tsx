'use client';

import React from 'react';
import { AddExpense } from './AddExpense';
import { createExpenseWithCustomSplits } from '@/lib/api/expenses';
import { HouseholdMember } from '@/lib/types/types';
import toast from 'react-hot-toast';

interface AddExpenseAdapterProps {
  householdId: string;
  members: HouseholdMember[];
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
  currentUserId: string;
  context?: 'dashboard' | 'settlement' | 'chat' | 'expenses';
}

export const AddExpenseAdapter: React.FC<AddExpenseAdapterProps> = ({
  householdId,
  members,
  isOpen,
  onClose,
  onExpenseAdded,
  currentUserId,
  context = 'expenses'
}) => {
  const handleAddExpense = async (expense: any) => {
    try {
      // Convert the new expense format to API format
      const customSplits = expense.splitType === 'equal' 
        ? {} 
        : expense.splitBetween.reduce((acc: any, userId: string) => ({
            ...acc,
            [userId]: expense.customSplits?.[userId] || expense.amount / expense.splitBetween.length
          }), {});
      
      await createExpenseWithCustomSplits(
        householdId,
        expense.description,
        expense.amount,
        expense.paidBy,
        expense.splitType,
        customSplits,
        new Date(expense.date).toISOString().split('T')[0]
      );
      
      await onExpenseAdded();
      onClose();
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('Failed to add expense');
      throw error;
    }
  };

  return (
    <AddExpense
      isOpen={isOpen}
      onCancel={onClose}
      householdMembers={members.map(m => ({ 
        id: m.user_id, 
        name: m.display_name || 'Unknown', 
        avatar: m.avatar_url 
      }))}
      currentUserId={currentUserId}
      context={context}
      onAddExpense={handleAddExpense}
    />
  );
};