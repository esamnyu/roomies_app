import { useState, useMemo, useCallback } from 'react';
import type { HouseholdMember, Expense } from '@/lib/types/types';
import {
  calculateExpenseSplits,
  validateSplits,
  initializeEqualPercentages,
  type SplitMode,
  type ExpenseSplit
} from '@/lib/expense-calculations';

interface UseSimpleExpenseSplitsReturn {
  // Amount
  amount: number;
  setAmount: (amount: number) => void;
  
  // Split configuration
  splitMode: SplitMode;
  setSplitMode: (mode: SplitMode) => void;
  
  // Participants
  selectedParticipants: Set<string>;
  toggleParticipant: (userId: string) => void;
  selectAllParticipants: () => void;
  
  // Custom amounts (for custom mode)
  customAmounts: Record<string, number>;
  setCustomAmount: (userId: string, amount: number) => void;
  
  // Percentages (for percentage mode)
  percentages: Record<string, number>;
  setPercentage: (userId: string, percentage: number) => void;
  
  // Results
  splits: ExpenseSplit[];
  validation: { isValid: boolean; errors: string[] };
  totalSplitAmount: number;
  totalPercentage: number;
}

export function useSimpleExpenseSplits(
  members: HouseholdMember[],
  initialExpense?: Expense
): UseSimpleExpenseSplitsReturn {
  // Initialize amount
  const [amount, setAmount] = useState(() => initialExpense?.amount || 0);
  
  // Initialize split mode
  const [splitMode, setSplitMode] = useState<SplitMode>(() => {
    if (initialExpense?.expense_splits && initialExpense.expense_splits.length > 0) {
      return 'custom';
    }
    return 'equal';
  });
  
  // Initialize selected participants
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(() => {
    if (initialExpense?.expense_splits) {
      return new Set(initialExpense.expense_splits.map(s => s.user_id));
    }
    return new Set(members.map(m => m.user_id));
  });
  
  // Initialize custom amounts
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>(() => {
    if (initialExpense?.expense_splits) {
      return initialExpense.expense_splits.reduce((acc, split) => {
        acc[split.user_id] = split.amount;
        return acc;
      }, {} as Record<string, number>);
    }
    return {};
  });
  
  // Initialize percentages
  const [percentages, setPercentages] = useState<Record<string, number>>(() => {
    return initializeEqualPercentages(Array.from(selectedParticipants));
  });
  
  // Toggle participant selection
  const toggleParticipant = useCallback((userId: string) => {
    setSelectedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        // Don't allow removing the last participant
        if (next.size > 1) {
          next.delete(userId);
          // Clean up custom amounts and percentages
          setCustomAmounts(curr => {
            const updated = { ...curr };
            delete updated[userId];
            return updated;
          });
          setPercentages(curr => {
            const updated = { ...curr };
            delete updated[userId];
            return updated;
          });
        }
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);
  
  // Select all participants
  const selectAllParticipants = useCallback(() => {
    const allIds = members.map(m => m.user_id);
    setSelectedParticipants(new Set(allIds));
    if (splitMode === 'percentage') {
      setPercentages(initializeEqualPercentages(allIds));
    }
  }, [members, splitMode]);
  
  // Handle split mode change
  const handleSetSplitMode = useCallback((mode: SplitMode) => {
    setSplitMode(mode);
    if (mode === 'percentage') {
      setPercentages(initializeEqualPercentages(Array.from(selectedParticipants)));
    }
  }, [selectedParticipants]);
  
  // Set custom amount for a user
  const setCustomAmount = useCallback((userId: string, amount: number) => {
    setCustomAmounts(prev => ({
      ...prev,
      [userId]: Math.max(0, amount)
    }));
  }, []);
  
  // Set percentage for a user
  const setPercentage = useCallback((userId: string, percentage: number) => {
    setPercentages(prev => ({
      ...prev,
      [userId]: Math.max(0, Math.min(100, percentage))
    }));
  }, []);
  
  // Calculate splits
  const splits = useMemo(() => {
    const participantIds = Array.from(selectedParticipants);
    return calculateExpenseSplits({
      amount,
      participants: participantIds,
      mode: splitMode,
      customAmounts,
      percentages
    });
  }, [amount, selectedParticipants, splitMode, customAmounts, percentages]);
  
  // Validate splits
  const validation = useMemo(() => {
    return validateSplits(splits, amount, splitMode, percentages);
  }, [splits, amount, splitMode, percentages]);
  
  // Calculate totals for display
  const totalSplitAmount = useMemo(() => {
    return splits.reduce((sum, split) => sum + split.amount, 0);
  }, [splits]);
  
  const totalPercentage = useMemo(() => {
    if (splitMode === 'percentage') {
      return Object.values(percentages).reduce((sum, p) => sum + p, 0);
    }
    return 0;
  }, [splitMode, percentages]);
  
  return {
    amount,
    setAmount,
    splitMode,
    setSplitMode: handleSetSplitMode,
    selectedParticipants,
    toggleParticipant,
    selectAllParticipants,
    customAmounts,
    setCustomAmount,
    percentages,
    setPercentage,
    splits,
    validation,
    totalSplitAmount,
    totalPercentage
  };
}