'use client';

import React from 'react';
import { Modal } from '@/components/surfaces/Modal/Modal';
import { SimpleUnifiedExpenseForm } from '@/components/SimpleUnifiedExpenseForm';
import { useExpenseOperations } from '@/hooks/useExpenseOperations';
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers';
import type { Expense } from '@/lib/types/types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null;
  householdId: string;
  mode?: 'create' | 'edit' | 'duplicate';
  onSuccess?: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  householdId,
  mode = expense ? 'edit' : 'create',
  onSuccess
}) => {
  const { members } = useHouseholdMembers(householdId);
  const {
    createExpense,
    updateExpense,
    deleteExpense,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    clearError,
    duplicateExpense: duplicateExpenseHelper
  } = useExpenseOperations(householdId, onSuccess);

  const handleSubmit = async (data: any) => {
    clearError();
    
    try {
      if (mode === 'edit' && expense) {
        await updateExpense({ expenseId: expense.id, data });
      } else {
        await createExpense(data);
      }
      onClose();
    } catch (error) {
      // Error is already handled in the hook with toast
      console.error('Expense operation failed:', error);
    }
  };

  const handleDelete = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      onClose();
    } catch (error) {
      // Error is already handled in the hook with toast
      console.error('Delete operation failed:', error);
    }
  };

  const handleDuplicate = (expense: Expense) => {
    const formData = duplicateExpenseHelper(expense);
    // Close current modal and open new one with duplicated data
    onClose();
    // You might want to handle this differently based on your app structure
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <SimpleUnifiedExpenseForm
        expense={expense}
        onCancel={onClose}
        onSuccess={onSuccess || (() => {})}
        householdId={householdId}
        householdMembers={members}
        currentUserId=""
        mode={mode === 'duplicate' ? 'create' : mode}
        isOpen={true}
      />
    </Modal>
  );
};