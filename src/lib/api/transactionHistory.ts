import { supabase } from '../supabase';

export interface TransactionLog {
  id: string;
  transaction_type: 'expense_created' | 'expense_updated' | 'expense_deleted' | 'settlement_created';
  transaction_id: string;
  amount: number;
  description: string;
  created_at: string;
  metadata: {
    role?: 'payer' | 'participant' | 'payee';
    expense_date?: string;
    payee_id?: string;
    payer_id?: string;
  };
}

/**
 * Get transaction history for a user
 * This provides a simple audit trail without changing your existing balance calculation
 */
export const getUserTransactions = async (
  householdId: string,
  userId?: string,
  limit: number = 50
): Promise<TransactionLog[]> => {
  const { data, error } = await supabase
    .rpc('get_user_transactions', {
      p_household_id: householdId,
      p_user_id: userId || null,
      p_limit: limit
    });

  if (error) {
    console.error('Error fetching transaction history:', error);
    throw error;
  }

  return data || [];
};