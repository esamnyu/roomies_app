import type { HouseholdMember } from './types/types';

export type SplitMode = 'equal' | 'custom' | 'percentage';

export interface ExpenseSplit {
  user_id: string;
  amount: number;
}

interface CalculateSplitsOptions {
  amount: number;
  participants: string[];
  mode: SplitMode;
  customAmounts?: Record<string, number>;
  percentages?: Record<string, number>;
}

/**
 * Calculate expense splits based on the selected mode
 * Simple, pure function that returns the splits array
 */
export function calculateExpenseSplits({
  amount,
  participants,
  mode,
  customAmounts = {},
  percentages = {}
}: CalculateSplitsOptions): ExpenseSplit[] {
  if (participants.length === 0 || amount <= 0) {
    return [];
  }

  switch (mode) {
    case 'equal': {
      const shareAmount = amount / participants.length;
      let remaining = amount;
      
      return participants.map((userId, index) => {
        // Last participant gets the remainder to handle rounding
        if (index === participants.length - 1) {
          return { user_id: userId, amount: roundCurrency(remaining) };
        }
        const share = roundCurrency(shareAmount);
        remaining -= share;
        return { user_id: userId, amount: share };
      });
    }

    case 'custom': {
      return participants.map(userId => ({
        user_id: userId,
        amount: roundCurrency(customAmounts[userId] || 0)
      }));
    }

    case 'percentage': {
      let remaining = amount;
      
      return participants.map((userId, index) => {
        const percentage = percentages[userId] || 0;
        
        // Last participant gets the remainder to handle rounding
        if (index === participants.length - 1) {
          return { user_id: userId, amount: roundCurrency(remaining) };
        }
        
        const share = roundCurrency((amount * percentage) / 100);
        remaining -= share;
        return { user_id: userId, amount: share };
      });
    }
  }
}

/**
 * Validate that splits are correct
 */
export function validateSplits(
  splits: ExpenseSplit[],
  totalAmount: number,
  mode: SplitMode,
  percentages?: Record<string, number>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (splits.length === 0) {
    errors.push('At least one participant is required');
  }

  if (totalAmount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  // Check total matches for custom mode
  if (mode === 'custom') {
    const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0);
    const difference = Math.abs(splitTotal - totalAmount);
    
    if (difference > 0.01) {
      errors.push(`Split amounts ($${splitTotal.toFixed(2)}) must equal total ($${totalAmount.toFixed(2)})`);
    }
  }

  // Check percentages total 100 for percentage mode
  if (mode === 'percentage' && percentages) {
    const percentageTotal = Object.values(percentages).reduce((sum, p) => sum + p, 0);
    const difference = Math.abs(percentageTotal - 100);
    
    if (difference > 0.01) {
      errors.push(`Percentages must total 100% (current: ${percentageTotal.toFixed(2)}%)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Round currency to 2 decimal places
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Initialize equal percentages for percentage mode
 */
export function initializeEqualPercentages(participantIds: string[]): Record<string, number> {
  if (participantIds.length === 0) return {};
  
  const basePercentage = 100 / participantIds.length;
  const percentages: Record<string, number> = {};
  let remaining = 100;

  participantIds.forEach((id, index) => {
    if (index === participantIds.length - 1) {
      // Last person gets the remainder
      percentages[id] = roundCurrency(remaining);
    } else {
      const percentage = roundCurrency(basePercentage);
      percentages[id] = percentage;
      remaining -= percentage;
    }
  });

  return percentages;
}