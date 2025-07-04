import { supabase } from '../supabase';

export interface LedgerEntry {
  entry_id: string;
  user_id: string;
  amount: number;
  entry_type: 'debit' | 'credit';
  transaction_type: 'expense' | 'settlement' | 'reversal';
  description: string;
  created_at: string;
  reference_id: string;
  reference_table: 'expenses' | 'settlements';
  metadata: Record<string, any>;
}

export interface BalanceWithHistory {
  currentBalance: number;
  entries: LedgerEntry[];
}

/**
 * Get ledger history showing all transactions
 */
export const getLedgerHistory = async (
  householdId: string,
  userId?: string,
  limit: number = 50
): Promise<LedgerEntry[]> => {
  const { data, error } = await supabase
    .rpc('get_ledger_history', {
      p_household_id: householdId,
      p_user_id: userId || null,
      p_limit: limit
    });

  if (error) {
    console.error('Error fetching ledger history:', error);
    throw error;
  }

  return data || [];
};

/**
 * Calculate current balance from ledger
 */
export const calculateUserBalance = async (
  householdId: string,
  userId: string
): Promise<number> => {
  const { data, error } = await supabase
    .rpc('calculate_user_balance', {
      p_household_id: householdId,
      p_user_id: userId
    });

  if (error) {
    console.error('Error calculating balance:', error);
    throw error;
  }

  return data || 0;
};

/**
 * Get balance with transaction history
 */
export const getBalanceWithHistory = async (
  householdId: string,
  userId: string
): Promise<BalanceWithHistory> => {
  const [balance, entries] = await Promise.all([
    calculateUserBalance(householdId, userId),
    getLedgerHistory(householdId, userId, 20)
  ]);

  return {
    currentBalance: balance,
    entries
  };
};

/**
 * Verify ledger balances match current system
 */
export const verifyLedgerBalances = async (householdId: string) => {
  const { data, error } = await supabase
    .rpc('verify_ledger_balances')
    .eq('household_id', householdId);

  if (error) {
    console.error('Error verifying balances:', error);
    throw error;
  }

  return data || [];
};