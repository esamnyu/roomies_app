import { useState, useMemo, useCallback, useReducer } from 'react';
import { z } from 'zod';
import type { HouseholdMember, Expense } from '@/lib/types/types';

// Validation schemas
const splitTypeSchema = z.enum(['equal', 'custom', 'percentage']);
const amountSchema = z.number().finite().nonnegative().max(999999.99);
const userIdSchema = z.string().uuid();

const expenseSplitSchema = z.object({
  user_id: userIdSchema,
  amount: amountSchema
});

export type SplitType = z.infer<typeof splitTypeSchema>;
export type ExpenseSplit = z.infer<typeof expenseSplitSchema>;

// Constants
const PRECISION_THRESHOLD = 0.01;
const MAX_MEMBERS = 50;
const MIN_AMOUNT = 0.01;

// Utility functions (pure, testable)
const roundCurrency = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

const distributeRoundingError = (
  splits: ExpenseSplit[], 
  targetTotal: number
): ExpenseSplit[] => {
  const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const difference = roundCurrency(targetTotal - currentTotal);
  
  if (Math.abs(difference) < PRECISION_THRESHOLD || splits.length === 0) {
    return splits;
  }
  
  // For equal splits, distribute rounding errors evenly across users
  // to maintain true equality when possible
  const isEqualSplit = splits.every(s => Math.abs(s.amount - splits[0].amount) < PRECISION_THRESHOLD);
  
  if (isEqualSplit && Math.abs(difference) <= splits.length * 0.01) {
    // Distribute error across multiple users for better equality
    const errorPerSplit = Math.sign(difference) * 0.01;
    const numSplitsToAdjust = Math.min(Math.abs(Math.round(difference * 100)), splits.length);
    
    return splits.map((s, index) => ({
      ...s,
      amount: index < numSplitsToAdjust 
        ? roundCurrency(s.amount + errorPerSplit)
        : s.amount
    }));
  }
  
  // Fallback: distribute error to the split with the largest amount
  const maxSplit = splits.reduce((max, s) => 
    s.amount > max.amount ? s : max, splits[0]
  );
  
  return splits.map(s => ({
    ...s,
    amount: s.user_id === maxSplit.user_id 
      ? roundCurrency(s.amount + difference) 
      : s.amount
  }));
};

// State reducer for complex state management
type SplitState = {
  splitType: SplitType;
  customAmounts: Record<string, number>;
  percentages: Record<string, number>;
  includedUserIds: string[];
};

type SplitAction = 
  | { type: 'SET_SPLIT_TYPE'; payload: SplitType }
  | { type: 'SET_CUSTOM_AMOUNT'; payload: { userId: string; amount: number } }
  | { type: 'SET_PERCENTAGE'; payload: { userId: string; percentage: number } }
  | { type: 'TOGGLE_USER'; payload: string }
  | { type: 'RESET_TO_EQUAL'; payload: string[] }
  | { type: 'INIT_FROM_EXPENSE'; payload: { expense: Expense; userIds: string[] } };

const splitReducer = (state: SplitState, action: SplitAction): SplitState => {
  switch (action.type) {
    case 'SET_SPLIT_TYPE':
      if (action.payload === 'equal') {
        return {
          ...state,
          splitType: action.payload,
          customAmounts: {},
          percentages: {}
        };
      }
      if (action.payload === 'percentage') {
        const equalPercentage = state.includedUserIds.length > 0 
          ? 100 / state.includedUserIds.length 
          : 0;
        const percentages = state.includedUserIds.reduce<Record<string, number>>((acc, id) => ({
          ...acc,
          [id]: roundCurrency(equalPercentage)
        }), {});
        
        // Adjust for rounding errors
        const total = Object.values(percentages).reduce((sum, p) => sum + p, 0);
        if (total !== 100 && state.includedUserIds.length > 0) {
          percentages[state.includedUserIds[0]] += roundCurrency(100 - total);
        }
        
        return {
          ...state,
          splitType: action.payload,
          customAmounts: {},
          percentages
        };
      }
      return { ...state, splitType: action.payload, percentages: {} };
      
    case 'SET_CUSTOM_AMOUNT':
      if (state.splitType !== 'custom') return state;
      return {
        ...state,
        customAmounts: {
          ...state.customAmounts,
          [action.payload.userId]: Math.max(0, action.payload.amount)
        }
      };
      
    case 'SET_PERCENTAGE':
      if (state.splitType !== 'percentage') return state;
      return {
        ...state,
        percentages: {
          ...state.percentages,
          [action.payload.userId]: Math.max(0, Math.min(100, action.payload.percentage))
        }
      };
      
    case 'TOGGLE_USER':
      const isIncluded = state.includedUserIds.includes(action.payload);
      if (isIncluded && state.includedUserIds.length === 1) {
        // Don't allow removing the last user
        return state;
      }
      
      const newIncludedIds = isIncluded
        ? state.includedUserIds.filter(id => id !== action.payload)
        : [...state.includedUserIds, action.payload];
        
      // Clean up custom amounts and percentages for removed users
      const newCustomAmounts = { ...state.customAmounts };
      const newPercentages = { ...state.percentages };
      
      if (isIncluded) {
        delete newCustomAmounts[action.payload];
        delete newPercentages[action.payload];
      }
      
      return {
        ...state,
        includedUserIds: newIncludedIds,
        customAmounts: newCustomAmounts,
        percentages: newPercentages
      };
      
    case 'RESET_TO_EQUAL':
      return {
        splitType: 'equal',
        customAmounts: {},
        percentages: {},
        includedUserIds: action.payload
      };
      
    case 'INIT_FROM_EXPENSE':
      const { expense, userIds } = action.payload;
      if (!expense.expense_splits || expense.expense_splits.length === 0) {
        return {
          splitType: 'equal',
          customAmounts: {},
          percentages: {},
          includedUserIds: userIds
        };
      }
      
      const customAmounts = expense.expense_splits.reduce((acc, split) => {
        if (userIds.includes(split.user_id)) {
          acc[split.user_id] = split.amount;
        }
        return acc;
      }, {} as Record<string, number>);
      
      return {
        splitType: 'custom',
        customAmounts,
        percentages: {},
        includedUserIds: Object.keys(customAmounts)
      };
      
    default:
      return state;
  }
};

export function useExpenseSplits(
  members: HouseholdMember[], 
  initialExpense?: Expense
) {
  // Validate members
  const validMembers = useMemo(() => {
    try {
      return members.filter(m => userIdSchema.safeParse(m.user_id).success)
        .slice(0, MAX_MEMBERS);
    } catch {
      console.error('Invalid members data');
      return [];
    }
  }, [members]);
  
  const memberIds = useMemo(() => validMembers.map(m => m.user_id), [validMembers]);
  
  // Initialize state with reducer
  const [state, dispatch] = useReducer(splitReducer, {
    splitType: 'equal',
    customAmounts: {},
    percentages: {},
    includedUserIds: memberIds
  }, (initial) => {
    if (initialExpense && memberIds.length > 0) {
      return splitReducer(initial, { 
        type: 'INIT_FROM_EXPENSE', 
        payload: { expense: initialExpense, userIds: memberIds }
      });
    }
    return initial;
  });
  
  // Amount state with validation
  const [amount, setAmountInternal] = useState<number>(() => {
    const parsed = amountSchema.safeParse(initialExpense?.amount ?? 0);
    return parsed.success ? parsed.data : 0;
  });
  
  const setAmount = useCallback((newAmount: number) => {
    const parsed = amountSchema.safeParse(newAmount);
    setAmountInternal(parsed.success ? parsed.data : 0);
  }, []);
  
  // Memoized calculations
  const finalSplits = useMemo((): ExpenseSplit[] => {
    if (state.includedUserIds.length === 0 || amount < MIN_AMOUNT) {
      return [];
    }
    
    let splits: ExpenseSplit[];
    
    switch (state.splitType) {
      case 'custom':
        splits = state.includedUserIds.map(userId => ({
          user_id: userId,
          amount: roundCurrency(state.customAmounts[userId] || 0)
        }));
        break;
        
      case 'percentage':
        splits = state.includedUserIds.map(userId => {
          const percentage = state.percentages[userId] || 0;
          return {
            user_id: userId,
            amount: roundCurrency((amount * percentage) / 100)
          };
        });
        splits = distributeRoundingError(splits, amount);
        break;
        
      case 'equal':
      default:
        const equalAmount = roundCurrency(amount / state.includedUserIds.length);
        splits = state.includedUserIds.map(userId => ({
          user_id: userId,
          amount: equalAmount
        }));
        splits = distributeRoundingError(splits, amount);
        break;
    }
    
    return splits;
  }, [amount, state]);
  
  const totals = useMemo(() => {
    const splitTotal = finalSplits.reduce((sum, s) => sum + s.amount, 0);
    const percentageTotal = state.splitType === 'percentage'
      ? Object.values(state.percentages).reduce((sum, p) => sum + p, 0)
      : 0;
      
    return { splitTotal: roundCurrency(splitTotal), percentageTotal };
  }, [finalSplits, state.percentages, state.splitType]);
  
  const validation = useMemo(() => {
    const errors: string[] = [];
    
    if (amount < MIN_AMOUNT) {
      errors.push('Amount must be greater than 0');
    }
    
    if (state.includedUserIds.length === 0) {
      errors.push('At least one member must be included');
    }
    
    if (state.splitType === 'custom') {
      const diff = Math.abs(totals.splitTotal - amount);
      if (diff >= PRECISION_THRESHOLD) {
        errors.push(`Split amounts don't match total (difference: $${diff.toFixed(2)})`);
      }
    }
    
    if (state.splitType === 'percentage') {
      const diff = Math.abs(totals.percentageTotal - 100);
      if (diff >= PRECISION_THRESHOLD) {
        errors.push(`Percentages must total 100% (current: ${totals.percentageTotal.toFixed(2)}%)`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [amount, state, totals]);
  
  // Action handlers
  const setSplitType = useCallback((type: SplitType) => {
    const parsed = splitTypeSchema.safeParse(type);
    if (parsed.success) {
      dispatch({ type: 'SET_SPLIT_TYPE', payload: parsed.data });
    }
  }, []);
  
  const toggleMemberInclusion = useCallback((userId: string) => {
    if (userIdSchema.safeParse(userId).success) {
      dispatch({ type: 'TOGGLE_USER', payload: userId });
    }
  }, []);
  
  const setCustomSplit = useCallback((userId: string, amount: number) => {
    if (userIdSchema.safeParse(userId).success) {
      dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: { userId, amount } });
    }
  }, []);
  
  const setPercentageSplit = useCallback((userId: string, percentage: number) => {
    if (userIdSchema.safeParse(userId).success) {
      dispatch({ type: 'SET_PERCENTAGE', payload: { userId, percentage } });
    }
  }, []);
  
  const resetToEqual = useCallback(() => {
    dispatch({ type: 'RESET_TO_EQUAL', payload: memberIds });
  }, [memberIds]);
  
  return {
    // Amount
    amount,
    setAmount,
    
    // Split configuration
    splitType: state.splitType,
    setSplitType,
    
    // Member management
    includedMembers: new Set(state.includedUserIds),
    toggleMemberInclusion,
    
    // Split values
    customSplits: state.customAmounts,
    setCustomSplits: (splits: Record<string, number>) => {
      Object.entries(splits).forEach(([userId, amount]) => {
        setCustomSplit(userId, amount);
      });
    },
    setCustomSplit,
    
    // Percentage values
    percentageSplits: state.percentages,
    setPercentageSplits: (percentages: Record<string, number>) => {
      Object.entries(percentages).forEach(([userId, percentage]) => {
        setPercentageSplit(userId, percentage);
      });
    },
    setPercentageSplit,
    
    // Results
    finalSplits,
    isValid: validation.isValid,
    validationErrors: validation.errors,
    totalSplitValue: totals.splitTotal,
    totalPercentageValue: totals.percentageTotal,
    
    // Actions
    resetToEqual
  };
}