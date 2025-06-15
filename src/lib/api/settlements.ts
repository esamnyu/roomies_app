import { supabase } from '../supabase';
import { subscriptionManager } from '../subscriptionManager';
import type { Settlement, Expense, HouseholdMember, Profile } from '../types/types';

// This function is updated to accept a single object.
export const createSettlement = async (settlement: Omit<Settlement, 'id' | 'created_at' | 'payer_profile' | 'payee_profile'>) => {
  const { data, error } = await supabase
    .rpc('create_settlement_and_notify', {
      p_household_id: settlement.household_id,
      p_payee_id: settlement.payee_id,
      p_amount: settlement.amount,
      p_description: settlement.description
    })
    .select(`
      *,
      payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
      payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
    `)
    .single();

  if (error) {
    console.error("Error creating settlement:", error);
    throw error;
  }

  return data;
};

export const getHouseholdSettlements = async (householdId: string) => {
  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
      payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
    `)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
};

export const subscribeToSettlements = (householdId: string, onSettlement: (settlement: Settlement) => void) => {
  const key = `settlements:${householdId}`;
  const subscription = supabase
    .channel(key)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'settlements',
      filter: `household_id=eq.${householdId}`
    }, async (payload) => {
      if (payload.new) {
        const newSettlement = payload.new as Settlement;
        const { data } = await supabase
          .from('settlements')
          .select(`
            *,
            payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
            payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
          `)
          .eq('id', newSettlement.id)
          .single();
        if (data) onSettlement(data);
      }
    })
    .subscribe();
  return subscriptionManager.subscribe(key, subscription);
};

// --- BALANCE & SETTLEMENT CALCULATION HELPERS ---

export const calculateBalances = (expenses: Expense[], members: HouseholdMember[], settlements?: Settlement[]): { userId: string; balance: number; profile: Profile }[] => {
  const balanceMap = new Map<string, number>();

  members.forEach(member => {
    if (member.user_id && !member.user_id.startsWith('placeholder_')) {
      balanceMap.set(member.user_id, 0);
    }
  });

  expenses.forEach(expense => {
    if (!expense.paid_by || !balanceMap.has(expense.paid_by)) return;

    const payerBalance = balanceMap.get(expense.paid_by) || 0;
    balanceMap.set(expense.paid_by, payerBalance + expense.amount);

    expense.expense_splits?.forEach(split => {
      if (!split.settled && split.user_id && balanceMap.has(split.user_id)) {
        const currentBalance = balanceMap.get(split.user_id) || 0;
        balanceMap.set(split.user_id, currentBalance - split.amount);
      }
    });
  });

  if (settlements) {
    settlements.forEach(settlement => {
      if (!settlement.payer_id || !settlement.payee_id || settlement.amount <= 0) return;

      if (balanceMap.has(settlement.payer_id)) {
        const payerBalance = balanceMap.get(settlement.payer_id) || 0;
        balanceMap.set(settlement.payer_id, payerBalance + settlement.amount);
      }

      if (balanceMap.has(settlement.payee_id)) {
        const payeeBalance = balanceMap.get(settlement.payee_id) || 0;
        balanceMap.set(settlement.payee_id, payeeBalance - settlement.amount);
      }
    });
  }

  return Array.from(balanceMap.entries())
    .map(([userId, balance]) => {
      const member = members.find(m => m.user_id === userId);
      if (!member?.profiles) {
        console.warn(`Profile not found for user ID: ${userId} in calculateBalances.`);
        return null;
      }
      return {
        userId,
        balance: Math.round(balance * 100) / 100,
        profile: member.profiles
      };
    })
    .filter(Boolean) as { userId: string; balance: number; profile: Profile }[];
};

export const getSettlementSuggestions = (balances: ReturnType<typeof calculateBalances>): { from: string; to: string; amount: number; fromProfile: Profile; toProfile: Profile }[] => {
  const suggestions: { from: string; to: string; amount: number; fromProfile: Profile; toProfile: Profile }[] = [];
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const tempDebtors = [...debtors]; const tempCreditors = [...creditors];
  while (tempDebtors.length > 0 && tempCreditors.length > 0) {
    const debtor = tempDebtors[0]; const creditor = tempCreditors[0];
    if (!debtor.profile || !creditor.profile) { console.warn('Skipping settlement suggestion due to missing profile information.'); if (!debtor.profile) tempDebtors.shift(); if (!creditor.profile) tempCreditors.shift(); continue; }
    const debtAmount = Math.abs(debtor.balance); const creditAmount = creditor.balance; const settlementAmount = Math.min(debtAmount, creditAmount);
    suggestions.push({ from: debtor.userId, to: creditor.userId, amount: Math.round(settlementAmount * 100) / 100, fromProfile: debtor.profile, toProfile: creditor.profile });
    debtor.balance += settlementAmount; creditor.balance -= settlementAmount;
    if (Math.abs(debtor.balance) < 0.01) tempDebtors.shift(); if (creditor.balance < 0.01) tempCreditors.shift();
  }
  return suggestions;
};